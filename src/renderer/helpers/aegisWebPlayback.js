export const AEGIS_WEB_PLAYBACK_EMBED_ORIGIN = 'https://www.youtube-nocookie.com'
export const AEGIS_WEB_SHARE_ORIGIN = 'https://os.aegisos.me'

const AEGIS_WEB_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.aegisos\.pages\.dev$/
const ALLOWED_AEGIS_WEB_ORIGINS = new Set([
  'https://os.aegisos.me',
  'https://app.aegisos.me',
])
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/** Keep browser player timestamps bounded before they can affect a URL or command. */
export function normalizeAegisWebStartSeconds(value) {
  return Number.isInteger(value) && value >= 0 && value <= 43200 ? value : null
}

export function isAegisWebPlaybackMode({ webEdition, nativeExtractor }) {
  return Boolean(webEdition) && nativeExtractor !== true
}

export function isAllowedAegisWebOrigin(value) {
  if (typeof value !== 'string') return false
  if (ALLOWED_AEGIS_WEB_ORIGINS.has(value)) return true
  try {
    const url = new URL(value)
    return url.origin === value && AEGIS_WEB_ORIGIN_PATTERN.test(value)
  } catch {
    return false
  }
}

/**
 * Construct the sole browser playback URL. This deliberately accepts only a
 * canonical video ID and an AegisOS-hosted origin: no stream URL, arbitrary
 * host, download parameter, playlist injection, or authenticated relay.
 */
export function createAegisWebPlaybackUrl({ videoId, origin, startSeconds = 0, autoplay = false }) {
  if (typeof videoId !== 'string' || !VIDEO_ID_PATTERN.test(videoId)) return null
  if (!isAllowedAegisWebOrigin(origin)) return null
  if (normalizeAegisWebStartSeconds(startSeconds) === null) return null
  if (typeof autoplay !== 'boolean') return null

  const url = new URL(`/embed/${videoId}`, AEGIS_WEB_PLAYBACK_EMBED_ORIGIN)
  // Browser embeds do not autoplay by default. The mini-player may set this
  // after a direct user handoff, so continued viewing is never background work.
  url.searchParams.set('autoplay', autoplay ? '1' : '0')
  url.searchParams.set('controls', '1')
  url.searchParams.set('enablejsapi', '1')
  url.searchParams.set('iv_load_policy', '3')
  url.searchParams.set('origin', origin)
  url.searchParams.set('playsinline', '1')
  url.searchParams.set('rel', '0')
  if (startSeconds > 0) url.searchParams.set('start', String(startSeconds))
  return url.toString()
}

/**
 * Create the only browser share link: the fixed AegisOS host plus a validated
 * hash-route video ID and an optional bounded playback timestamp. It cannot
 * carry a provider URL, media URL, playlist injection, or tracking payload.
 */
export function createAegisWebTimestampShareUrl({ videoId, startSeconds = 0 }) {
  if (typeof videoId !== 'string' || !VIDEO_ID_PATTERN.test(videoId)) return null
  if (normalizeAegisWebStartSeconds(startSeconds) === null) return null
  const url = new URL('/aegistube/index.html', AEGIS_WEB_SHARE_ORIGIN)
  url.hash = `/watch/${videoId}${startSeconds > 0 ? `?timestamp=${startSeconds}` : ''}`
  return url.toString()
}

export function canUseAegisWebPlayback({ webEdition, nativeExtractor, videoId, origin }) {
  return isAegisWebPlaybackMode({ webEdition, nativeExtractor }) &&
    createAegisWebPlaybackUrl({ videoId, origin }) !== null
}
