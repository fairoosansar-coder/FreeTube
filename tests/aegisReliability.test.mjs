import assert from 'node:assert/strict'
import {
  canonicalVideoThumbnail,
  classifyAegisVideoError,
  createProviderCapabilityState,
  nextProviderCapabilityState,
  normalizeAegisThumbnailUrl,
  selectDeterministicProvider,
} from '../src/renderer/helpers/aegisReliability.js'

const fallback = 'controlled-fallback'
const provider = 'https://inv.example.test'

function test(name, fn) {
  try {
    fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

test('relative vi path becomes canonical HTTPS thumbnail', () => {
  assert.equal(
    normalizeAegisThumbnailUrl('/vi/abcdefghijk/mqdefault.jpg', provider, fallback),
    'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'
  )
})

test('scheme-relative path becomes canonical HTTPS thumbnail', () => {
  assert.equal(
    normalizeAegisThumbnailUrl('//inv.example.test/vi/abcdefghijk/hqdefault.jpg', provider, fallback),
    'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg'
  )
})

test('canonical i.ytimg URL remains canonical', () => {
  assert.equal(
    normalizeAegisThumbnailUrl('https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg', provider, fallback),
    'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg'
  )
})

test('HTTP provider with port is rejected rather than blindly upgraded', () => {
  assert.equal(
    normalizeAegisThumbnailUrl('/vi/abcdefghijk/mqdefault.jpg', 'http://provider.example:3000', fallback),
    fallback
  )
})

for (const [name, value] of [
  ['unsupported provider host', 'https://evil.example/vi/abcdefghijk/mqdefault.jpg'],
  ['javascript URL', 'javascript:alert(1)'],
  ['data URL', 'data:image/png;base64,abc'],
  ['file URL', 'file:///tmp/a.png'],
  ['localhost URL', 'https://localhost/vi/abcdefghijk/mqdefault.jpg'],
  ['loopback URL', 'https://127.0.0.1/vi/abcdefghijk/mqdefault.jpg'],
  ['private network URL', 'https://192.168.1.10/vi/abcdefghijk/mqdefault.jpg'],
  ['empty URL', ''],
  ['malformed URL', 'https://[bad'],
]) {
  test(`${name} returns controlled fallback`, () => {
    assert.equal(normalizeAegisThumbnailUrl(value, provider, fallback), fallback)
  })
}

test('normalized thumbnail survives a later provider switch', () => {
  const fetched = normalizeAegisThumbnailUrl('/vi/abcdefghijk/mqdefault.jpg', provider, fallback)
  const afterSwitch = normalizeAegisThumbnailUrl(fetched, 'https://other.example.test', fallback)
  assert.equal(afterSwitch, fetched)
})

test('invalid local video IDs use the controlled fallback', () => {
  assert.equal(canonicalVideoThumbnail('invalid', fallback), fallback)
})

test('provider cooldown excludes failed provider and selection is deterministic', () => {
  const now = 1_000_000
  const failed = nextProviderCapabilityState(createProviderCapabilityState(), {
    capability: 'videoDetailHealthy', success: false, reason: 'HTTP 403', now
  })
  const selected = selectDeterministicProvider(
    ['https://z.example', 'https://a.example'],
    { 'https://a.example': failed, 'https://z.example': createProviderCapabilityState() },
    '', 'playback', now + 1
  )
  assert.equal(selected, 'https://z.example')
})

test('error classification hides raw optional and provider details', () => {
  assert.deepEqual(classifyAegisVideoError(new Error('Endpoint disabled')), {
    category: 'provider', diagnosticId: 'AE-PROVIDER-DETAIL'
  })
  assert.deepEqual(classifyAegisVideoError(new Error('unsupported YouTube API operation')), {
    category: 'optional', diagnosticId: 'AE-OPTIONAL-UNSUPPORTED'
  })
})

if (process.exitCode) process.exit(process.exitCode)
