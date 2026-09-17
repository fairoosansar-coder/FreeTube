import assert from 'node:assert/strict'
import {
  AEGIS_WEB_PLAYBACK_EMBED_ORIGIN,
  createAegisWebPlaybackUrl,
  isAegisWebPlaybackMode,
  isAllowedAegisWebOrigin,
} from '../src/renderer/helpers/aegisWebPlayback.js'

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

test('only the non-native AegisOS web edition uses browser playback mode', () => {
  assert.equal(isAegisWebPlaybackMode({ webEdition: true, nativeExtractor: false }), true)
  assert.equal(isAegisWebPlaybackMode({ webEdition: 'true', nativeExtractor: false }), true)
  assert.equal(isAegisWebPlaybackMode({ webEdition: true, nativeExtractor: true }), false)
  assert.equal(isAegisWebPlaybackMode({ webEdition: false, nativeExtractor: false }), false)
})

test('the embed URL is privacy-enhanced, origin-bound, and never autoplays', () => {
  const url = new URL(createAegisWebPlaybackUrl({
    videoId: 'dQw4w9WgXcQ',
    origin: 'https://os.aegisos.me',
  }))
  assert.equal(url.origin, AEGIS_WEB_PLAYBACK_EMBED_ORIGIN)
  assert.equal(url.pathname, '/embed/dQw4w9WgXcQ')
  assert.equal(url.searchParams.get('origin'), 'https://os.aegisos.me')
  assert.equal(url.searchParams.get('autoplay'), '0')
  assert.equal(url.searchParams.get('controls'), '1')
  assert.equal(url.searchParams.get('enablejsapi'), '1')
  assert.equal(url.searchParams.get('playsinline'), '1')
  assert.equal(url.searchParams.get('rel'), '0')
  assert.equal(url.searchParams.get('iv_load_policy'), '3')
})

test('only production AegisOS web origins and Pages previews are allowed', () => {
  assert.equal(isAllowedAegisWebOrigin('https://os.aegisos.me'), true)
  assert.equal(isAllowedAegisWebOrigin('https://app.aegisos.me'), true)
  assert.equal(isAllowedAegisWebOrigin('https://feature-preview.aegisos.pages.dev'), true)
  assert.equal(isAllowedAegisWebOrigin('https://evil.example'), false)
  assert.equal(isAllowedAegisWebOrigin('http://os.aegisos.me'), false)
})

test('invalid IDs and arbitrary origins cannot become embed URLs', () => {
  assert.equal(createAegisWebPlaybackUrl({ videoId: '../dQw4w9WgXcQ', origin: 'https://os.aegisos.me' }), null)
  assert.equal(createAegisWebPlaybackUrl({ videoId: 'dQw4w9WgXcQ', origin: 'https://evil.example' }), null)
  assert.equal(createAegisWebPlaybackUrl({ videoId: 'dQw4w9WgXcQ?playlist=x', origin: 'https://os.aegisos.me' }), null)
})

console.log(`PASS ${count} deterministic AegisTube web-playback fixtures`)
if (process.exitCode) process.exit(process.exitCode)
