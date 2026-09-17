import assert from 'node:assert/strict'
import {
  AEGIS_WEB_FAVORITES_LIMIT,
  AEGIS_WEB_HISTORY_LIMIT,
  clearAegisWebLibraryCollection,
  isAegisWebFavorite,
  readAegisWebLibrary,
  recordAegisWebHistory,
  toggleAegisWebFavorite,
  updateAegisWebPlayerPreferences,
} from '../src/renderer/helpers/aegisWebLibrary.js'
import {
  AEGIS_WEB_PLAYER_MESSAGE_ORIGIN,
  clampAegisWebPlayerVolume,
  createAegisWebPlayerCommand,
  resolveAegisWebPlayerShortcut,
} from '../src/renderer/helpers/aegisWebPlayerControls.js'

class MemoryStorage {
  #values = new Map()
  getItem(key) { return this.#values.get(key) ?? null }
  setItem(key, value) { this.#values.set(key, String(value)) }
}

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

const storage = new MemoryStorage()
const firstVideo = { videoId: 'dQw4w9WgXcQ', title: 'Validated title', author: 'Validated author' }
const secondVideo = { videoId: 'M7lc1UVf-VE', title: 'Second', author: 'Channel' }

test('keyboard routing ignores editable and modifier contexts while preserving requested player commands', () => {
  assert.equal(resolveAegisWebPlayerShortcut({ key: 'k', target: { tagName: 'DIV' } }), 'toggle-playback')
  assert.equal(resolveAegisWebPlayerShortcut({ key: 'ArrowUp', target: { tagName: 'DIV' } }), 'volume-up')
  assert.equal(resolveAegisWebPlayerShortcut({ key: 'f', target: { tagName: 'INPUT' } }), null)
  assert.equal(resolveAegisWebPlayerShortcut({ key: 'd', ctrlKey: true, target: { tagName: 'DIV' } }), null)
  assert.equal(resolveAegisWebPlayerShortcut({ key: 'x', target: { tagName: 'DIV' } }), null)
})

test('official-player commands are allowlisted, serialized, and never accept arbitrary functions', () => {
  assert.equal(AEGIS_WEB_PLAYER_MESSAGE_ORIGIN, 'https://www.youtube-nocookie.com')
  assert.deepEqual(JSON.parse(createAegisWebPlayerCommand('setVolume', [75])), { event: 'command', func: 'setVolume', args: [75] })
  assert.equal(createAegisWebPlayerCommand('loadVideoByUrl', ['https://evil.example']), null)
  assert.equal(createAegisWebPlayerCommand('setVolume', [101]), null)
  assert.equal(clampAegisWebPlayerVolume(103), 100)
  assert.equal(clampAegisWebPlayerVolume(-1), 0)
})

test('favorites retain only validated canonical metadata and toggle deterministically', () => {
  assert.equal(toggleAegisWebFavorite(firstVideo, storage, 1000).isFavorite, true)
  assert.equal(isAegisWebFavorite(firstVideo.videoId, storage), true)
  const saved = readAegisWebLibrary(storage, 1000).favorites[0]
  assert.equal(saved.videoId, firstVideo.videoId)
  assert.equal(saved.title, firstVideo.title)
  assert.equal(saved.thumbnail, 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')
  assert.equal(toggleAegisWebFavorite(firstVideo, storage, 2000).isFavorite, false)
  assert.equal(readAegisWebLibrary(storage, 2000).favorites.length, 0)
})

test('history is deduplicated by validated video ID and moves the latest visit to the front', () => {
  recordAegisWebHistory(firstVideo, storage, 1000)
  recordAegisWebHistory(secondVideo, storage, 2000)
  recordAegisWebHistory({ videoId: firstVideo.videoId, title: '', author: '' }, storage, 3000)
  const history = readAegisWebLibrary(storage, 3000).history
  assert.equal(history.length, 2)
  assert.equal(history[0].videoId, firstVideo.videoId)
  assert.equal(history[0].title, firstVideo.title)
  assert.equal(history[0].watchedAt, 3000)
})

test('invalid entries are rejected and local collections remain explicitly clearable', () => {
  const before = readAegisWebLibrary(storage, 4000).history.length
  recordAegisWebHistory({ videoId: '../bad', title: 'Nope', author: 'Nope' }, storage, 4000)
  assert.equal(readAegisWebLibrary(storage, 4000).history.length, before)
  clearAegisWebLibraryCollection('history', storage)
  assert.equal(readAegisWebLibrary(storage, 4000).history.length, 0)
})

test('preference persistence keeps dark, theater, volume and mute state bounded', () => {
  const preferences = updateAegisWebPlayerPreferences({ darkMode: true, theatreMode: true, volume: 133, muted: true }, storage)
  assert.deepEqual(preferences, { darkMode: true, theatreMode: true, volume: 100, muted: true })
  assert.deepEqual(readAegisWebLibrary(storage).preferences, preferences)
})

test('retention limits are explicit and bounded', () => {
  assert.equal(AEGIS_WEB_FAVORITES_LIMIT, 200)
  assert.equal(AEGIS_WEB_HISTORY_LIMIT, 500)
})

console.log(`PASS ${count} deterministic AegisTube web player and library fixtures`)
if (process.exitCode) process.exit(process.exitCode)
