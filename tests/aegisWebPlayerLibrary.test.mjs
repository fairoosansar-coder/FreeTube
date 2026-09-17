import assert from 'node:assert/strict'
import {
  AEGIS_WEB_FOLDER_LIMIT,
  AEGIS_WEB_FOLDER_MEMBERSHIP_LIMIT,
  AEGIS_WEB_FAVORITES_LIMIT,
  AEGIS_WEB_HISTORY_LIMIT,
  AEGIS_WEB_TOTAL_FOLDER_MEMBERSHIPS_LIMIT,
  clearAegisWebLibraryCollection,
  createAegisWebFolder,
  createAegisWebLibraryExport,
  deleteAegisWebFolder,
  isAegisWebFavorite,
  readAegisWebLibrary,
  recordAegisWebHistory,
  renameAegisWebFolder,
  requestAegisWebLibraryExport,
  toggleAegisWebFavorite,
  toggleAegisWebFolderMembership,
  updateAegisWebPlayerPreferences,
} from '../src/renderer/helpers/aegisWebLibrary.js'
import {
  AEGIS_WEB_PLAYER_MESSAGE_ORIGIN,
  clampAegisWebPlayerVolume,
  createAegisWebPlayerCommand,
  readAegisWebPlayerCurrentTime,
  resolveAegisWebPlayerShortcut,
} from '../src/renderer/helpers/aegisWebPlayerControls.js'
import { normalizeAegisWebMiniPlayerEntry } from '../src/renderer/helpers/aegisWebMiniPlayer.js'
import { createAegisWebPlaybackUrl } from '../src/renderer/helpers/aegisWebPlayback.js'

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
  assert.deepEqual(JSON.parse(createAegisWebPlayerCommand('getCurrentTime')), { event: 'command', func: 'getCurrentTime', args: [] })
  assert.equal(createAegisWebPlayerCommand('loadVideoByUrl', ['https://evil.example']), null)
  assert.equal(createAegisWebPlayerCommand('setVolume', [101]), null)
  assert.equal(clampAegisWebPlayerVolume(103), 100)
  assert.equal(clampAegisWebPlayerVolume(-1), 0)
})

test('player-time messages are bounded and only valid mini-player entries retain canonical metadata', () => {
  assert.equal(readAegisWebPlayerCurrentTime({ info: { currentTime: 72.8 } }), 72)
  assert.equal(readAegisWebPlayerCurrentTime({ info: { currentTime: 43201 } }), null)
  assert.equal(readAegisWebPlayerCurrentTime('{bad'), null)
  assert.deepEqual(normalizeAegisWebMiniPlayerEntry({ ...firstVideo, resumeSeconds: 8.9 }), {
    videoId: firstVideo.videoId,
    title: firstVideo.title,
    author: firstVideo.author,
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    resumeSeconds: 8,
  })
  assert.equal(normalizeAegisWebMiniPlayerEntry({ ...firstVideo, videoId: 'https://bad.example' }), null)
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

test('folders accept only favorite membership, preserve bounded names, and clean membership after a favorite is removed', () => {
  toggleAegisWebFavorite(firstVideo, storage, 5000)
  let library = createAegisWebFolder(' Research\nQueue ', storage, 5001, 'folder_research01')
  assert.equal(library.folders[0].name, 'Research Queue')
  assert.deepEqual(library.folders[0].videoIds, [])
  library = toggleAegisWebFolderMembership('folder_research01', firstVideo.videoId, storage)
  assert.deepEqual(library.folders[0].videoIds, [firstVideo.videoId])
  library = toggleAegisWebFolderMembership('folder_research01', 'bad', storage)
  assert.deepEqual(library.folders[0].videoIds, [firstVideo.videoId])
  toggleAegisWebFavorite(firstVideo, storage, 5002)
  assert.deepEqual(readAegisWebLibrary(storage).folders[0].videoIds, [])
})

test('folder rename, deletion, and identifier validation preserve a bounded local model', () => {
  let library = createAegisWebFolder('Watch later', storage, 6000, 'folder_watchlater1')
  library = renameAegisWebFolder('folder_watchlater1', 'Curated viewing', storage)
  assert.equal(library.folders.find((folder) => folder.id === 'folder_watchlater1').name, 'Curated viewing')
  const before = library.folders.length
  library = createAegisWebFolder('Ignored', storage, 6001, 'unsafe-id')
  assert.equal(library.folders.length, before)
  library = deleteAegisWebFolder('folder_watchlater1', storage)
  assert.equal(library.folders.some((folder) => folder.id === 'folder_watchlater1'), false)
})

test('exports are user-portable but include only bounded validated browser-local metadata with CSV formula neutralization', () => {
  toggleAegisWebFavorite({ ...firstVideo, title: '=SUM(1,1)' }, storage, 7000)
  recordAegisWebHistory(secondVideo, storage, 7001)
  createAegisWebFolder('Backup folder', storage, 7002, 'folder_backup01')
  toggleAegisWebFolderMembership('folder_backup01', firstVideo.videoId, storage)
  const json = createAegisWebLibraryExport('json', storage, Date.UTC(2026, 8, 17))
  const csv = createAegisWebLibraryExport('csv', storage, Date.UTC(2026, 8, 17))
  assert.equal(json.filename, 'aegistube-library-2026-09-17.json')
  assert.equal(json.mimeType, 'application/json;charset=utf-8')
  assert.equal(JSON.parse(json.content).schema, 'aegistube-browser-library-backup')
  assert.equal(csv.filename, 'aegistube-library-2026-09-17.csv')
  assert.match(csv.content, /"'=SUM\(1,1\)"/)
  assert.match(csv.content, /"folder-membership"/)
  assert.equal(createAegisWebLibraryExport('zip', storage), null)
})

test('browser-local export requests only a fixed same-origin parent handoff, never a child-frame download', () => {
  const messages = []
  const windowRef = {
    location: { origin: 'https://os.aegisos.me' },
    parent: { postMessage: (message, targetOrigin) => messages.push({ message, targetOrigin }) },
  }
  assert.equal(requestAegisWebLibraryExport('json', { windowRef, storage, now: Date.UTC(2026, 8, 17) }), true)
  assert.equal(messages.length, 1)
  assert.equal(messages[0].targetOrigin, 'https://os.aegisos.me')
  assert.equal(messages[0].message.channel, 'aegisos:freetube:v1')
  assert.equal(messages[0].message.type, 'browser-local-export')
  assert.match(messages[0].message.filename, /^aegistube-library-2026-09-17\.json$/)
  assert.equal(messages[0].message.mimeType, 'application/json;charset=utf-8')
  assert.equal(JSON.parse(messages[0].message.content).schema, 'aegistube-browser-library-backup')
  assert.equal(requestAegisWebLibraryExport('zip', { windowRef, storage }), false)
  assert.equal(requestAegisWebLibraryExport('json', { windowRef: { location: { origin: 'https://evil.example' }, parent: null }, storage }), false)
})

test('mini-player resume URLs remain constrained to a validated video ID, approved origin and bounded user handoff', () => {
  const url = createAegisWebPlaybackUrl({ videoId: firstVideo.videoId, origin: 'https://os.aegisos.me', startSeconds: 12, autoplay: true })
  assert.match(url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/)
  assert.match(url, /(?:\?|&)start=12(?:&|$)/)
  assert.match(url, /(?:\?|&)autoplay=1(?:&|$)/)
  assert.equal(createAegisWebPlaybackUrl({ videoId: firstVideo.videoId, origin: 'https://evil.example', autoplay: true }), null)
  assert.equal(createAegisWebPlaybackUrl({ videoId: firstVideo.videoId, origin: 'https://os.aegisos.me', startSeconds: 43201, autoplay: true }), null)
})

test('retention limits are explicit and bounded', () => {
  assert.equal(AEGIS_WEB_FAVORITES_LIMIT, 200)
  assert.equal(AEGIS_WEB_HISTORY_LIMIT, 500)
  assert.equal(AEGIS_WEB_FOLDER_LIMIT, 50)
  assert.equal(AEGIS_WEB_FOLDER_MEMBERSHIP_LIMIT, 200)
  assert.equal(AEGIS_WEB_TOTAL_FOLDER_MEMBERSHIPS_LIMIT, 1000)
})

console.log(`PASS ${count} deterministic AegisTube web player and library fixtures`)
if (process.exitCode) process.exit(process.exitCode)
