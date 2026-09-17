export const AEGIS_WEB_PLAYBACK_EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

const AEGIS_WEB_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.aegisos\.pages\.dev$/
const ALLOWED_AEGIS_WEB_ORIGINS = new Set([
  'https://os.aegisos.me',
  'https://app.aegisos.me',
])
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

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
export function createAegisWebPlaybackUrl({ videoId, origin }) {
  if (typeof videoId !== 'string' || !VIDEO_ID_PATTERN.test(videoId)) return null
  if (!isAllowedAegisWebOrigin(origin)) return null

  const url = new URL(`/embed/${videoId}`, AEGIS_WEB_PLAYBACK_EMBED_ORIGIN)
  url.searchParams.set('autoplay', '0')
  url.searchParams.set('controls', '1')
  url.searchParams.set('enablejsapi', '1')
  url.searchParams.set('iv_load_policy', '3')
  url.searchParams.set('origin', origin)
  url.searchParams.set('playsinline', '1')
  url.searchParams.set('rel', '0')
  return url.toString()
}

export function canUseAegisWebPlayback({ webEdition, nativeExtractor, videoId, origin }) {
  return isAegisWebPlaybackMode({ webEdition, nativeExtractor }) &&
    createAegisWebPlaybackUrl({ videoId, origin }) !== null
}
