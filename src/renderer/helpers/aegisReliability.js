const CANONICAL_THUMBNAIL_HOSTS = new Set([
  'i.ytimg.com', 'i0.ytimg.com', 'i1.ytimg.com', 'i2.ytimg.com', 'i3.ytimg.com', 'i4.ytimg.com',
])

const CAPABILITIES = ['discovery', 'videoDetail', 'formats', 'streamProbe', 'comments', 'optional', 'nativeRequired', 'nativeOptional']

export class AegisCapabilityError extends Error {
  constructor(capability, code, message) {
    super(message)
    this.name = 'AegisCapabilityError'
    this.capability = capability
    this.code = code
  }
}

function stripIpv6Brackets(hostname) {
  return hostname.replaceAll(/^\[|\]$/g, '').toLowerCase()
}

function parseIpv4(hostname) {
  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part))) return null
  const values = parts.map(Number)
  return values.every(value => value >= 0 && value <= 255) ? values : null
}

function isBlockedIpv4(parts) {
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0)
}

function isBlockedHostname(hostname) {
  const host = stripIpv6Brackets(hostname)
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  const ipv4 = parseIpv4(host)
  if (ipv4 !== null) return isBlockedIpv4(ipv4)
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return true
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped !== null
    ? isBlockedIpv4(parseIpv4(mapped[1]) ?? [0, 0, 0, 0])
    : false
}

function parseApprovedProviderOrigin(value, approvedOrigins = []) {
  try {
    const url = new URL(value)
    const approved = approvedOrigins.length === 0 || approvedOrigins.some(origin => {
      try { return new URL(origin).origin === url.origin } catch { return false }
    })
    const safe = url.protocol === 'https:' && url.username === '' && url.password === '' &&
      !isBlockedHostname(url.hostname) && approved
    return safe
      ? url
      : null
  } catch {
    return null
  }
}

function isCanonicalThumbnail(url) {
  return url.protocol === 'https:' && CANONICAL_THUMBNAIL_HOSTS.has(url.hostname) && url.pathname.startsWith('/vi/')
}

export function isApprovedAegisAssetUrl(value, providerOrigin = '', approvedOrigins = []) {
  if (typeof value !== 'string' || value.trim() === '') return false
  let url
  try { url = new URL(value) } catch { return false }
  if (url.protocol !== 'https:' || url.username || url.password || isBlockedHostname(url.hostname)) return false
  if (isCanonicalThumbnail(url)) return true
  const provider = parseApprovedProviderOrigin(providerOrigin, approvedOrigins)
  return provider !== null && url.origin === provider.origin && url.pathname.startsWith('/ggpht/')
}

/** Normalize only validated provider assets to immutable canonical or approved HTTPS URLs. */
export function normalizeAegisThumbnailUrl(value, providerOrigin, fallback = '', approvedOrigins = []) {
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const provider = parseApprovedProviderOrigin(providerOrigin, approvedOrigins)
  let url
  try { url = new URL(value, provider ?? undefined) } catch { return fallback }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || isBlockedHostname(url.hostname)) return fallback
  if (provider !== null && url.pathname.startsWith('/vi/') && url.origin === provider.origin) {
    return new URL(`${url.pathname}${url.search}`, 'https://i.ytimg.com').toString()
  }
  if (isCanonicalThumbnail(url)) return url.toString()
  if (provider !== null && url.origin === provider.origin && url.protocol === 'https:' && url.pathname.startsWith('/ggpht/')) return url.toString()
  return fallback
}

/** Final renderer boundary: never return an arbitrary non-empty record field. */
export function selectNormalizedThumbnail(thumbnails, fallback = '', providerOrigin = '', approvedOrigins = []) {
  if (!Array.isArray(thumbnails)) return fallback
  const selected = thumbnails.find(thumbnail => {
    return thumbnail && isApprovedAegisAssetUrl(thumbnail.url, providerOrigin, approvedOrigins)
  })
  return selected?.url ?? fallback
}

export function canonicalVideoThumbnail(videoId, variant = 'mqdefault', fallback = '') {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId) &&
    ['default', 'mqdefault', 'mq1', 'mq2', 'mq3', 'maxres1', 'maxres2', 'maxres3', 'maxresdefault'].includes(variant)
    ? `https://i.ytimg.com/vi/${videoId}/${variant}.jpg`
    : fallback
}

function createCapability(status = 'unknown') {
  return {
    status,
    failureCount: 0,
    cooldownUntil: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureReason: null,
    latencyMs: null,
  }
}

export function createProviderCapabilityState() {
  return {
    capabilities: Object.fromEntries(CAPABILITIES.map(capability => [capability, createCapability()])),
    discoveryHealthy: null,
    videoDetailHealthy: null,
    formatsHealthy: null,
    streamProbeHealthy: null,
  }
}

function capabilityKey(value) {
  return value.endsWith('Healthy') ? value.replace('Healthy', '') : value
}

export function nextProviderCapabilityState(previous, { capability, success, latencyMs = null, reason = null, now = Date.now(), halfOpen = false }) {
  const state = { ...createProviderCapabilityState(), ...previous, capabilities: { ...createProviderCapabilityState().capabilities, ...previous?.capabilities } }
  const key = capabilityKey(capability)
  const prior = state.capabilities[key] ?? createCapability()
  const next = { ...prior }
  if (success) {
    next.status = 'healthy'
    next.failureCount = 0
    next.cooldownUntil = 0
    next.lastSuccessAt = now
    next.lastFailureReason = null
    if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) next.latencyMs = latencyMs
  } else {
    next.status = halfOpen ? 'cooldown' : 'failed'
    next.failureCount += 1
    next.lastFailureAt = now
    next.lastFailureReason = reason || 'unknown'
    next.cooldownUntil = now + Math.min(300000, 5000 * 2 ** (next.failureCount - 1))
  }
  state.capabilities[key] = next
  if (key === 'discovery' || key === 'videoDetail' || key === 'formats' || key === 'streamProbe') state[`${key}Healthy`] = success
  return state
}

function capabilityEligible(entry, now, allowHalfOpen) {
  if (entry.status === 'healthy') return true
  if (entry.status === 'unknown') return allowHalfOpen
  return entry.cooldownUntil <= now && allowHalfOpen
}

export function providerEligible(state, capability, now = Date.now(), allowHalfOpen = false) {
  const value = { ...createProviderCapabilityState(), ...state }
  const capabilities = { ...createProviderCapabilityState().capabilities, ...value.capabilities }
  if (capability === 'playback') {
    return capabilityEligible(capabilities.videoDetail, now, allowHalfOpen) &&
      capabilityEligible(capabilities.formats, now, allowHalfOpen) &&
      capabilityEligible(capabilities.streamProbe, now, allowHalfOpen)
  }
  return capabilityEligible(capabilities.discovery, now, allowHalfOpen)
}

export function selectDeterministicProvider(origins, capabilities, failedOrigin = '', capability = 'discovery', now = Date.now()) {
  const ordered = [...origins].filter(origin => origin !== failedOrigin).sort((a, b) => a.localeCompare(b))
  return ordered.find(origin => providerEligible(capabilities[origin], capability, now, false)) ??
    ordered.find(origin => providerEligible(capabilities[origin], capability, now, true)) ?? ''
}

export function hasConsumerUsableFormats(result) {
  const combined = Array.isArray(result.formatStreams) && result.formatStreams.some(format => typeof format.url === 'string' && format.url !== '' && typeof format.mimeType === 'string' && format.mimeType.includes('video/'))
  const adaptive = Array.isArray(result.adaptiveFormats) && result.adaptiveFormats.some(format => typeof format.url === 'string' && format.url !== '' && typeof format.mimeType === 'string' && (format.mimeType.includes('video/') || format.mimeType.includes('audio/')))
  const hls = typeof result.hlsUrl === 'string' && result.hlsUrl.startsWith('https://') && result.liveNow === true && adaptive
  return combined || adaptive || hls
}

export function selectVideoDetailRoute({ nativeBridgeV3, backendPreference }) {
  return nativeBridgeV3 ? 'native' : backendPreference === 'invidious' ? 'invidious' : 'local'
}

export function classifyAegisVideoError(error, operation = 'videoDetail') {
  if (error instanceof AegisCapabilityError) return { category: operation === 'comments' || operation === 'optional' ? 'optional' : 'fatal', diagnosticId: error.code }
  const message = error instanceof Error ? error.message : String(error)
  if (operation === 'comments' || operation === 'optional') return { category: 'optional', diagnosticId: 'AE-OPTIONAL-FAILED' }
  if (/unsupported YouTube API operation/i.test(message)) return { category: 'optional', diagnosticId: 'AE-OPTIONAL-UNSUPPORTED' }
  if (/HTTP 403|Endpoint disabled/i.test(message)) return { category: 'fatal', diagnosticId: 'AE-PROVIDER-DETAIL' }
  if (/bridge|native video/i.test(message)) return { category: 'fatal', diagnosticId: 'AE-NATIVE-BRIDGE' }
  return { category: 'fatal', diagnosticId: 'AE-PLAYBACK-UNKNOWN' }
}
