import { canonicalVideoThumbnail } from './aegisReliability.js'

export const AEGIS_WEB_LIBRARY_STORAGE_KEY = 'aegistube.web-library.v1'
export const AEGIS_WEB_FAVORITES_LIMIT = 200
export const AEGIS_WEB_HISTORY_LIMIT = 500

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const TEXT_LIMITS = { title: 300, author: 160 }

function cleanText(value, limit) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit)
}

function timestamp(value, fallback) {
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function emptyLibrary() {
  return {
    version: 1,
    preferences: { darkMode: false, theatreMode: false, volume: 70, muted: false },
    favorites: [],
    history: [],
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

export function readAegisWebLibrary(storage, now = Date.now()) {
  const target = resolveStorage(storage)
  if (target === null) return emptyLibrary()
  try {
    const parsed = JSON.parse(target.getItem(AEGIS_WEB_LIBRARY_STORAGE_KEY) || 'null')
    if (parsed === null || typeof parsed !== 'object' || parsed.version !== 1) return emptyLibrary()
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
    return { version: 1, preferences, favorites, history }
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
  return commit(library, storage)
}

export function clearAegisWebLibraryCollection(collection, storage) {
  if (!['favorites', 'history'].includes(collection)) return readAegisWebLibrary(storage)
  const library = readAegisWebLibrary(storage)
  library[collection] = []
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
