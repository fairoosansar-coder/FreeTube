import { canonicalVideoThumbnail } from './aegisReliability.js'

export const AEGIS_WEB_MINI_PLAYER_EVENT = 'aegistube:web-mini-player'

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const MAX_RESUME_SECONDS = 43200

function cleanText(value, limit) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, limit) : ''
}

export function normalizeAegisWebMiniPlayerEntry(value) {
  if (value === null || typeof value !== 'object' || !VIDEO_ID_PATTERN.test(value.videoId)) return null
  const resumeSeconds = Number.isFinite(value.resumeSeconds) && value.resumeSeconds >= 0
    ? Math.min(MAX_RESUME_SECONDS, Math.floor(value.resumeSeconds))
    : 0
  return {
    videoId: value.videoId,
    title: cleanText(value.title, 300),
    author: cleanText(value.author, 160),
    thumbnail: canonicalVideoThumbnail(value.videoId, 'mqdefault'),
    resumeSeconds,
  }
}

export function dispatchAegisWebMiniPlayer(entry) {
  const normalized = normalizeAegisWebMiniPlayerEntry(entry)
  if (normalized === null || typeof window === 'undefined') return false
  window.dispatchEvent(new CustomEvent(AEGIS_WEB_MINI_PLAYER_EVENT, { detail: normalized }))
  return true
}
