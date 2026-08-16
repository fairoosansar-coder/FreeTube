const CANONICAL_THUMBNAIL_HOSTS = new Set([
  'i.ytimg.com',
  'i0.ytimg.com',
  'i1.ytimg.com',
  'i2.ytimg.com',
  'i3.ytimg.com',
  'i4.ytimg.com',
])

const PRIVATE_HOST_PATTERN = /^(?:localhost|(?:0|10|127)\.|169\.254\.|172\.(?:1[6-9]|2\d|3[0-1])\.|192\.168\.|::1$|fc|fd)/i

function isSafeProviderOrigin(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      !PRIVATE_HOST_PATTERN.test(url.hostname)
  } catch {
    return false
  }
}

function isCanonicalThumbnail(url) {
  return url.protocol === 'https:' && CANONICAL_THUMBNAIL_HOSTS.has(url.hostname) &&
    url.pathname.startsWith('/vi/')
}

/**
 * Converts an Invidious thumbnail asset to a deterministic, browser-safe URL.
 * Relative or provider-bound `/vi/` paths are deliberately mapped to YouTube's
 * canonical HTTPS thumbnail host, so a later provider switch cannot break cards.
 * @param {unknown} value
 * @param {string} providerOrigin
 * @param {string} [fallback='']
 * @returns {string}
 */
export function normalizeAegisThumbnailUrl(value, providerOrigin, fallback = '') {
  if (typeof value !== 'string' || value.trim() === '' || !isSafeProviderOrigin(providerOrigin)) {
    return fallback
  }

  let provider
  let url
  try {
    provider = new URL(providerOrigin)
    url = new URL(value, provider)
  } catch {
    return fallback
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    PRIVATE_HOST_PATTERN.test(url.hostname)) {
    return fallback
  }

  if (url.origin !== provider.origin && !isCanonicalThumbnail(url)) {
    return fallback
  }

  if (url.pathname.startsWith('/vi/')) {
    return new URL(`${url.pathname}${url.search}`, 'https://i.ytimg.com').toString()
  }

  if (isCanonicalThumbnail(url)) {
    return url.toString()
  }

  if (url.origin === provider.origin && url.protocol === 'https:' && url.pathname.startsWith('/ggpht/')) {
    return url.toString()
  }

  return fallback
}

/**
 * Picks the normalized thumbnail already associated with the fetched record.
 * No current-provider reconstruction occurs here.
 * @param {unknown} thumbnails
 * @param {string} [fallback='']
 * @returns {string}
 */
export function selectNormalizedThumbnail(thumbnails, fallback = '') {
  if (!Array.isArray(thumbnails)) return fallback
  const selected = thumbnails.find(thumbnail => {
    return thumbnail && typeof thumbnail.url === 'string' && thumbnail.url.trim() !== '' && thumbnail.url !== fallback
  })
  return selected?.url ?? fallback
}

/**
 * Produces a safe canonical fallback for locally stored videos without binding
 * it to an Invidious provider.
 * @param {unknown} videoId
 * @param {string} [fallback='']
 * @returns {string}
 */
export function canonicalVideoThumbnail(videoId, fallback = '') {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    : fallback
}

export function createProviderCapabilityState() {
  return {
    discoveryHealthy: null,
    videoDetailHealthy: null,
    formatsHealthy: null,
    streamProbeHealthy: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    consecutiveFailures: 0,
    cooldownUntil: 0,
    lastFailureReason: null,
    latencyMs: null,
  }
}

export function nextProviderCapabilityState(previous, { capability, success, latencyMs = null, reason = null, now = Date.now() }) {
  const state = { ...createProviderCapabilityState(), ...previous }
  if (success) {
    state[capability] = true
    state.lastSuccessAt = now
    state.consecutiveFailures = 0
    state.cooldownUntil = 0
    state.lastFailureReason = null
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) state.latencyMs = latencyMs
    return state
  }

  state[capability] = false
  state.lastFailureAt = now
  state.consecutiveFailures += 1
  state.lastFailureReason = reason || 'unknown'
  state.cooldownUntil = now + Math.min(300000, 5000 * 2 ** (state.consecutiveFailures - 1))
  return state
}

export function providerEligible(state, capability, now = Date.now()) {
  const value = { ...createProviderCapabilityState(), ...state }
  if (value.cooldownUntil > now) return false
  if (capability === 'playback') {
    return value.videoDetailHealthy !== false && value.formatsHealthy !== false
  }
  return value.discoveryHealthy !== false
}

export function selectDeterministicProvider(origins, capabilities, failedOrigin = '', capability = 'discovery', now = Date.now()) {
  return [...origins]
    .filter(origin => origin !== failedOrigin)
    .sort((a, b) => a.localeCompare(b))
    .find(origin => providerEligible(capabilities[origin], capability, now)) ?? ''
}

export function classifyAegisVideoError(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/unsupported YouTube API operation/i.test(message)) {
    return { category: 'optional', diagnosticId: 'AE-OPTIONAL-UNSUPPORTED' }
  }
  if (/HTTP 403|Endpoint disabled|No public Invidious instance/i.test(message)) {
    return { category: 'provider', diagnosticId: 'AE-PROVIDER-DETAIL' }
  }
  if (/bridge|native video/i.test(message)) {
    return { category: 'fatal', diagnosticId: 'AE-NATIVE-BRIDGE' }
  }
  return { category: 'fatal', diagnosticId: 'AE-PLAYBACK-UNKNOWN' }
}
