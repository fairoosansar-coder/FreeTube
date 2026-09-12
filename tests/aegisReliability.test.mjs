import assert from 'node:assert/strict'
import {
  AegisCapabilityError,
  canonicalVideoThumbnail,
  classifyAegisVideoError,
  createProviderCapabilityState,
  hasConsumerUsableFormats,
  isApprovedAegisAssetUrl,
  nextProviderCapabilityState,
  normalizeAegisThumbnailUrl,
  providerEligible,
  selectDeterministicProvider,
  selectNormalizedThumbnail,
  selectVideoDetailRoute,
} from '../src/renderer/helpers/aegisReliability.js'

const fallback = 'controlled-fallback'
const provider = 'https://inv.example.test'
const now = 1_000_000
let count = 0

function test(name, fn) {
  try {
    fn()
    count += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

test('relative provider vi path becomes canonical HTTPS thumbnail', () => {
  assert.equal(normalizeAegisThumbnailUrl('/vi/abcdefghijk/mqdefault.jpg', provider, fallback), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
})
test('canonical i.ytimg stays valid with empty provider origin', () => {
  assert.equal(normalizeAegisThumbnailUrl('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg', '', fallback), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
})
for (const [name, value] of [
  ['http', 'http://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'], ['data', 'data:image/png;base64,aa'], ['file', 'file:///tmp/a'], ['javascript', 'javascript:alert(1)'],
  ['localhost', 'https://localhost/a'], ['ipv4 loopback', 'https://127.0.0.1/a'], ['ipv4 private', 'https://192.168.1.10/a'], ['link local', 'https://169.254.1.1/a'],
  ['cgnat', 'https://100.64.1.1/a'], ['reserved', 'https://240.1.1.1/a'], ['ipv6 loopback', 'https://[::1]/a'], ['ipv6 ula', 'https://[fd00::1]/a'],
  ['ipv6 link-local', 'https://[fe80::1]/a'], ['ipv4 mapped private', 'https://[::ffff:192.168.1.1]/a'], ['credential', 'https://user:secret@i.ytimg.com/vi/abcdefghijk/a.jpg'], ['malformed', 'https://[bad'], ['unapproved origin', 'https://evil.example/a'],
]) {
  test(`unsafe final asset ${name} is rejected`, () => assert.equal(normalizeAegisThumbnailUrl(value, provider, fallback), fallback))
}
test('final thumbnail selection rejects arbitrary non-empty record URLs', () => {
  assert.equal(selectNormalizedThumbnail([{ url: 'https://evil.example/x.jpg' }], fallback), fallback)
  assert.equal(selectNormalizedThumbnail([{ url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' }], fallback), 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg')
})
test('canonical start middle and end thumbnail preferences are safe', () => {
  assert.equal(canonicalVideoThumbnail('abcdefghijk', 'mq1', fallback), 'https://i.ytimg.com/vi/abcdefghijk/mq1.jpg')
  assert.equal(canonicalVideoThumbnail('abcdefghijk', 'mq2', fallback), 'https://i.ytimg.com/vi/abcdefghijk/mq2.jpg')
  assert.equal(canonicalVideoThumbnail('abcdefghijk', 'mq3', fallback), 'https://i.ytimg.com/vi/abcdefghijk/mq3.jpg')
})

const noFormats = { formatStreams: [], adaptiveFormats: [], hlsUrl: '' }
const onlyUnusableAdaptive = { adaptiveFormats: [{ url: '', mimeType: 'audio/mp4' }], formatStreams: [] }
const usableCombined = { formatStreams: [{ url: 'https://stream.example/video', mimeType: 'video/mp4' }], adaptiveFormats: [] }
const usableAdaptive = { formatStreams: [], adaptiveFormats: [{ url: 'https://stream.example/video', mimeType: 'video/webm' }, { url: 'https://stream.example/audio', mimeType: 'audio/webm' }] }
const hlsOnly = { liveNow: true, hlsUrl: 'https://stream.example/live.m3u8', adaptiveFormats: [], formatStreams: [] }
test('valid detail with no formats is unusable', () => assert.equal(hasConsumerUsableFormats(noFormats), false))
test('empty adaptive formats is unusable', () => assert.equal(hasConsumerUsableFormats({ adaptiveFormats: [], formatStreams: [] }), false))
test('only unusable adaptive formats is unusable', () => assert.equal(hasConsumerUsableFormats(onlyUnusableAdaptive), false))
test('usable combined formats are accepted', () => assert.equal(hasConsumerUsableFormats(usableCombined), true))
test('supported adaptive audio/video combination is accepted', () => assert.equal(hasConsumerUsableFormats(usableAdaptive), true))
test('HLS only is rejected because Watch dereferences adaptiveFormats[0]', () => assert.equal(hasConsumerUsableFormats(hlsOnly), false))

function healthyPlaybackState() {
  let state = createProviderCapabilityState()
  for (const capability of ['videoDetail', 'formats', 'streamProbe']) {
    state = nextProviderCapabilityState(state, { capability, success: true, now })
  }
  return state
}
test('discovery-only provider is not playback-qualified', () => {
  const state = nextProviderCapabilityState(createProviderCapabilityState(), { capability: 'discovery', success: true, now })
  assert.equal(providerEligible(state, 'playback', now), false)
})
test('unknown playback state needs controlled half-open probe', () => {
  assert.equal(providerEligible(createProviderCapabilityState(), 'playback', now), false)
  assert.equal(providerEligible(createProviderCapabilityState(), 'playback', now, true), true)
})
test('video detail, format and stream failures create capability-specific cooldown', () => {
  for (const capability of ['videoDetail', 'formats', 'streamProbe']) {
    const state = nextProviderCapabilityState(healthyPlaybackState(), { capability, success: false, reason: capability, now })
    assert.equal(providerEligible(state, 'playback', now + 1), false)
    assert.equal(state.capabilities[capability].status, 'failed')
  }
})
test('cooldown expiry enables exactly a controlled half-open probe', () => {
  const failed = nextProviderCapabilityState(healthyPlaybackState(), { capability: 'formats', success: false, now })
  const expiry = failed.capabilities.formats.cooldownUntil
  assert.equal(providerEligible(failed, 'playback', expiry), false)
  assert.equal(providerEligible(failed, 'playback', expiry, true), true)
})
test('successful half-open probe restores healthy playback state', () => {
  const failed = nextProviderCapabilityState(healthyPlaybackState(), { capability: 'formats', success: false, now })
  const recovered = nextProviderCapabilityState(failed, { capability: 'formats', success: true, now: failed.capabilities.formats.cooldownUntil })
  assert.equal(providerEligible(recovered, 'playback', now + 20_000), true)
})
test('failed half-open recovery extends cooldown', () => {
  const failed = nextProviderCapabilityState(healthyPlaybackState(), { capability: 'formats', success: false, now })
  const retried = nextProviderCapabilityState(failed, { capability: 'formats', success: false, now: failed.capabilities.formats.cooldownUntil, halfOpen: true })
  assert.ok(retried.capabilities.formats.cooldownUntil > failed.capabilities.formats.cooldownUntil)
})
test('current provider in cooldown is skipped in deterministic alternate selection', () => {
  const states = { 'https://a.example': nextProviderCapabilityState(healthyPlaybackState(), { capability: 'formats', success: false, now }), 'https://b.example': healthyPlaybackState() }
  assert.equal(selectDeterministicProvider(Object.keys(states), states, 'https://a.example', 'playback', now + 1), 'https://b.example')
})
test('all providers unavailable returns no selection', () => {
  const failed = nextProviderCapabilityState(healthyPlaybackState(), { capability: 'formats', success: false, now })
  assert.equal(selectDeterministicProvider(['https://a.example'], { 'https://a.example': failed }, '', 'playback', now + 1), '')
})
test('bridge-v3 native extraction overrides saved Invidious preference', () => {
  assert.equal(selectVideoDetailRoute({ nativeBridgeV3: true, backendPreference: 'invidious' }), 'native')
  assert.equal(selectVideoDetailRoute({ nativeBridgeV3: false, backendPreference: 'invidious' }), 'invidious')
})
test('typed no-usable-formats error remains controlled fatal diagnostic', () => {
  assert.deepEqual(classifyAegisVideoError(new AegisCapabilityError('formats', 'AE-PROVIDER-NO-USABLE-FORMATS', 'no formats')), { category: 'fatal', diagnosticId: 'AE-PROVIDER-NO-USABLE-FORMATS' })
})
test('optional comment failure remains optional and cannot overwrite playback diagnostic', () => {
  assert.deepEqual(classifyAegisVideoError(new Error('Local API Error'), 'comments'), { category: 'optional', diagnosticId: 'AE-OPTIONAL-FAILED' })
})
test('approved canonical assets satisfy final render policy', () => {
  assert.equal(isApprovedAegisAssetUrl('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'), true)
})

console.log(`PASS ${count} deterministic Stage 1 fixtures`)
if (process.exitCode) process.exit(process.exitCode)
