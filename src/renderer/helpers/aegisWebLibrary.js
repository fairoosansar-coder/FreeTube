import { canonicalVideoThumbnail } from './aegisReliability.js'

export const AEGIS_WEB_LIBRARY_STORAGE_KEY = 'aegistube.web-library.v1'
export const AEGIS_WEB_FAVORITES_LIMIT = 200
export const AEGIS_WEB_HISTORY_LIMIT = 500
export const AEGIS_WEB_FOLDER_LIMIT = 50
export const AEGIS_WEB_FOLDER_MEMBERSHIP_LIMIT = 200
export const AEGIS_WEB_TOTAL_FOLDER_MEMBERSHIPS_LIMIT = 1000

const LIBRARY_VERSION = 2
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const FOLDER_ID_PATTERN = /^folder_[a-z0-9]{8,32}$/
const TEXT_LIMITS = { title: 300, author: 160, folderName: 80 }

function cleanText(value, limit) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit)
}

function timestamp(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function emptyLibrary() {
  return {
    version: LIBRARY_VERSION,
    preferences: { darkMode: false, theatreMode: false, volume: 70, muted: false },
    favorites: [],
    history: [],
    folders: [],
  }
}

function resolveStorage(storage) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') return storage
  if (typeof window === 'undefined') return null
  try { return window.localStorage } catch { return null }
}

function normalizeEntry(value, now) {
  if (value === null || typeof value !== 'object' || !VIDEO_ID_PATTERN.test(value.videoId)) return null
  const videoId = value.videoId
  return {
    videoId,
    title: cleanText(value.title, TEXT_LIMITS.title),
    author: cleanText(value.author, TEXT_LIMITS.author),
    thumbnail: canonicalVideoThumbnail(videoId, 'mqdefault'),
    savedAt: timestamp(value.savedAt, now),
    watchedAt: timestamp(value.watchedAt, now),
  }
}

function mergeEntry(next, current, now) {
  const normalized = normalizeEntry(next, now)
  if (normalized === null) return null
  if (current === undefined) return normalized
  return {
    ...normalized,
    title: normalized.title || current.title,
    author: normalized.author || current.author,
    savedAt: timestamp(current.savedAt, now),
  }
}

function normalizeFolder(value, favoriteIds, now, membershipBudget) {
  if (value === null || typeof value !== 'object' || !FOLDER_ID_PATTERN.test(value.id)) return null
  const name = cleanText(value.name, TEXT_LIMITS.folderName)
  if (name === '') return null
  const allowedMemberships = Array.isArray(value.videoIds)
    ? value.videoIds.filter((videoId, index, list) => VIDEO_ID_PATTERN.test(videoId) && favoriteIds.has(videoId) && list.indexOf(videoId) === index)
    : []
  const videoIds = allowedMemberships.slice(0, Math.min(AEGIS_WEB_FOLDER_MEMBERSHIP_LIMIT, membershipBudget.remaining))
  membershipBudget.remaining -= videoIds.length
  return { id: value.id, name, createdAt: timestamp(value.createdAt, now), videoIds }
}

function normalizeFolders(value, favorites, now) {
  if (!Array.isArray(value)) return []
  const favoriteIds = new Set(favorites.map((item) => item.videoId))
  const seen = new Set()
  const membershipBudget = { remaining: AEGIS_WEB_TOTAL_FOLDER_MEMBERSHIPS_LIMIT }
  return value
    .map((folder) => normalizeFolder(folder, favoriteIds, now, membershipBudget))
    .filter((folder) => folder !== null && !seen.has(folder.id) && (seen.add(folder.id) || true))
    .slice(0, AEGIS_WEB_FOLDER_LIMIT)
}

export function readAegisWebLibrary(storage, now = Date.now()) {
  const target = resolveStorage(storage)
  if (target === null) return emptyLibrary()
  try {
    const parsed = JSON.parse(target.getItem(AEGIS_WEB_LIBRARY_STORAGE_KEY) || 'null')
    if (parsed === null || typeof parsed !== 'object' || ![1, LIBRARY_VERSION].includes(parsed.version)) return emptyLibrary()
    const history = Array.isArray(parsed.history)
      ? parsed.history.map((item) => normalizeEntry(item, now)).filter(Boolean).slice(0, AEGIS_WEB_HISTORY_LIMIT)
      : []
    const favorites = Array.isArray(parsed.favorites)
      ? parsed.favorites.map((item) => normalizeEntry(item, now)).filter(Boolean).slice(0, AEGIS_WEB_FAVORITES_LIMIT)
      : []
    const preferences = parsed.preferences && typeof parsed.preferences === 'object'
      ? {
          darkMode: parsed.preferences.darkMode === true,
          theatreMode: parsed.preferences.theatreMode === true,
          volume: Number.isFinite(parsed.preferences.volume) ? Math.min(100, Math.max(0, Math.round(parsed.preferences.volume))) : 70,
          muted: parsed.preferences.muted === true,
        }
      : emptyLibrary().preferences
    return { version: LIBRARY_VERSION, preferences, favorites, history, folders: normalizeFolders(parsed.folders, favorites, now) }
  } catch {
    return emptyLibrary()
  }
}

export function writeAegisWebLibrary(library, storage) {
  const target = resolveStorage(storage)
  if (target === null) return false
  try {
    target.setItem(AEGIS_WEB_LIBRARY_STORAGE_KEY, JSON.stringify(library))
    return true
  } catch {
    return false
  }
}

function commit(library, storage) {
  writeAegisWebLibrary(library, storage)
  return library
}

export function recordAegisWebHistory(entry, storage, now = Date.now()) {
  const library = readAegisWebLibrary(storage, now)
  const current = library.history.find((item) => item.videoId === entry?.videoId)
  const normalized = mergeEntry({ ...entry, watchedAt: now }, current, now)
  if (normalized === null) return library
  library.history = [normalized, ...library.history.filter((item) => item.videoId !== normalized.videoId)].slice(0, AEGIS_WEB_HISTORY_LIMIT)
  return commit(library, storage)
}

export function toggleAegisWebFavorite(entry, storage, now = Date.now()) {
  const library = readAegisWebLibrary(storage, now)
  const current = library.favorites.find((item) => item.videoId === entry?.videoId)
  const normalized = mergeEntry({ ...entry, savedAt: now }, current, now)
  if (normalized === null) return { library, isFavorite: false }
  if (current !== undefined) {
    library.favorites = library.favorites.filter((item) => item.videoId !== normalized.videoId)
    library.folders = library.folders.map((folder) => ({ ...folder, videoIds: folder.videoIds.filter((videoId) => videoId !== normalized.videoId) }))
    return { library: commit(library, storage), isFavorite: false }
  }
  library.favorites = [normalized, ...library.favorites].slice(0, AEGIS_WEB_FAVORITES_LIMIT)
  return { library: commit(library, storage), isFavorite: true }
}

export function isAegisWebFavorite(videoId, storage) {
  return VIDEO_ID_PATTERN.test(videoId || '') && readAegisWebLibrary(storage).favorites.some((item) => item.videoId === videoId)
}

export function removeAegisWebLibraryEntry(collection, videoId, storage) {
  if (!['favorites', 'history'].includes(collection) || !VIDEO_ID_PATTERN.test(videoId || '')) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  library[collection] = library[collection].filter((item) => item.videoId !== videoId)
  if (collection === 'favorites') {
    library.folders = library.folders.map((folder) => ({ ...folder, videoIds: folder.videoIds.filter((memberId) => memberId !== videoId) }))
  }
  return commit(library, storage)
}

export function clearAegisWebLibraryCollection(collection, storage) {
  if (!['favorites', 'history'].includes(collection)) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  library[collection] = []
  if (collection === 'favorites') library.folders = library.folders.map((folder) => ({ ...folder, videoIds: [] }))
  return commit(library, storage)
}

function createFolderId(now) {
  const random = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? Array.from(crypto.getRandomValues(new Uint32Array(2))).map((value) => value.toString(36)).join('')
    : Math.random().toString(36).slice(2)
  return `folder_${`${now.toString(36)}${random}`.replace(/[^a-z0-9]/g, '').slice(0, 32).padEnd(8, '0')}`
}

export function createAegisWebFolder(name, storage, now = Date.now(), requestedId) {
  const library = readAegisWebLibrary(storage, now)
  const cleanName = cleanText(name, TEXT_LIMITS.folderName)
  if (requestedId !== undefined && !FOLDER_ID_PATTERN.test(requestedId)) return library
  const id = requestedId ?? createFolderId(now)
  if (cleanName === '' || library.folders.length >= AEGIS_WEB_FOLDER_LIMIT || library.folders.some((folder) => folder.id === id)) return library
  if (library.folders.some((folder) => folder.name.localeCompare(cleanName, undefined, { sensitivity: 'accent' }) === 0)) return library
  library.folders = [{ id, name: cleanName, createdAt: now, videoIds: [] }, ...library.folders]
  return commit(library, storage)
}

export function renameAegisWebFolder(folderId, name, storage) {
  if (!FOLDER_ID_PATTERN.test(folderId || '')) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  const cleanName = cleanText(name, TEXT_LIMITS.folderName)
  if (cleanName === '' || library.folders.some((folder) => folder.id !== folderId && folder.name.localeCompare(cleanName, undefined, { sensitivity: 'accent' }) === 0)) return library
  library.folders = library.folders.map((folder) => folder.id === folderId ? { ...folder, name: cleanName } : folder)
  return commit(library, storage)
}

export function deleteAegisWebFolder(folderId, storage) {
  if (!FOLDER_ID_PATTERN.test(folderId || '')) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  library.folders = library.folders.filter((folder) => folder.id !== folderId)
  return commit(library, storage)
}

export function toggleAegisWebFolderMembership(folderId, videoId, storage) {
  if (!FOLDER_ID_PATTERN.test(folderId || '') || !VIDEO_ID_PATTERN.test(videoId || '')) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  if (!library.favorites.some((item) => item.videoId === videoId)) return library
  const folder = library.folders.find((item) => item.id === folderId)
  if (folder === undefined) return library
  const currentTotal = library.folders.reduce((total, item) => total + item.videoIds.length, 0)
  library.folders = library.folders.map((item) => {
    if (item.id !== folderId) return item
    if (item.videoIds.includes(videoId)) return { ...item, videoIds: item.videoIds.filter((memberId) => memberId !== videoId) }
    if (item.videoIds.length >= AEGIS_WEB_FOLDER_MEMBERSHIP_LIMIT || currentTotal >= AEGIS_WEB_TOTAL_FOLDER_MEMBERSHIPS_LIMIT) return item
    return { ...item, videoIds: [...item.videoIds, videoId] }
  })
  return commit(library, storage)
}

export function updateAegisWebPlayerPreferences(update, storage) {
  const library = readAegisWebLibrary(storage)
  const preferences = { ...library.preferences }
  if (typeof update?.darkMode === 'boolean') preferences.darkMode = update.darkMode
  if (typeof update?.theatreMode === 'boolean') preferences.theatreMode = update.theatreMode
  if (Number.isFinite(update?.volume)) preferences.volume = Math.min(100, Math.max(0, Math.round(update.volume)))
  if (typeof update?.muted === 'boolean') preferences.muted = update.muted
  library.preferences = preferences
  return commit(library, storage).preferences
}

function csvCell(value) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ')
  const neutralized = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${neutralized.replace(/"/g, '""')}"`
}

function exportRecord(type, item, folder) {
  return {
    recordType: type,
    folderId: folder?.id ?? '',
    folderName: folder?.name ?? '',
    videoId: item?.videoId ?? '',
    title: item?.title ?? '',
    author: item?.author ?? '',
    thumbnail: item?.thumbnail ?? '',
    savedAt: item?.savedAt ?? '',
    watchedAt: item?.watchedAt ?? '',
  }
}

export function createAegisWebLibraryExport(format, storage, now = Date.now()) {
  if (!['json', 'csv'].includes(format)) return null
  const library = readAegisWebLibrary(storage, now)
  const exportedAt = new Date(now).toISOString()
  const backup = {
    schema: 'aegistube-browser-library-backup',
    version: LIBRARY_VERSION,
    exportedAt,
    favorites: library.favorites,
    history: library.history,
    folders: library.folders,
  }
  const stem = `aegistube-library-${exportedAt.slice(0, 10)}`
  if (format === 'json') return { filename: `${stem}.json`, mimeType: 'application/json;charset=utf-8', content: `${JSON.stringify(backup, null, 2)}\n` }
  const headers = ['recordType', 'folderId', 'folderName', 'videoId', 'title', 'author', 'thumbnail', 'savedAt', 'watchedAt']
  const records = [
    ...library.favorites.map((item) => exportRecord('favorite', item)),
    ...library.history.map((item) => exportRecord('history', item)),
    ...library.folders.flatMap((folder) => [
      exportRecord('folder', null, folder),
      ...folder.videoIds.map((videoId) => exportRecord('folder-membership', library.favorites.find((item) => item.videoId === videoId), folder)),
    ]),
  ]
  return { filename: `${stem}.csv`, mimeType: 'text/csv;charset=utf-8', content: `${headers.join(',')}\n${records.map((record) => headers.map((header) => csvCell(record[header])).join(',')).join('\n')}\n` }
}

/**
 * Generates an explicit browser-local download. The Blob URL remains alive
 * briefly after the trusted click because browsers can consume it on a later
 * task. The exported metadata is never uploaded or otherwise transmitted.
 */
export function requestAegisWebLibraryExport(format, {
  windowRef = window,
  storage,
  now = Date.now(),
} = {}) {
  const backup = createAegisWebLibraryExport(format)
  if (
    backup === null ||
    !windowRef?.location ||
    windowRef.parent === windowRef ||
    typeof windowRef.parent?.postMessage !== 'function'
  ) return false
  const targetOrigin = windowRef.location.origin
  if (typeof targetOrigin !== 'string' || !/^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(targetOrigin)) return false

  const id = globalThis.crypto?.randomUUID?.() ?? `${now}-${Math.random().toString(36).slice(2)}`
  windowRef.parent.postMessage({
    channel: 'aegisos:freetube:v1',
    type: 'browser-local-export',
    id,
    filename: backup.filename,
    mimeType: backup.mimeType,
    content: backup.content,
  }, targetOrigin)
  return true
}
