export const AEGIS_WEB_PLAYER_MESSAGE_ORIGIN = 'https://www.youtube-nocookie.com'
export const AEGIS_WEB_PLAYER_MAX_SECONDS = 43200

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

function boundedSeconds(value) {
  return Number.isFinite(value) && value >= 0 && value <= AEGIS_WEB_PLAYER_MAX_SECONDS
    ? Math.floor(value)
    : null
}

function isEditableTarget(target) {
  if (target === null || typeof target !== 'object') return false
  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : ''
  return target.isContentEditable === true || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function resolveAegisWebPlayerShortcut(event) {
  if (event?.defaultPrevented || event?.ctrlKey || event?.metaKey || event?.altKey || isEditableTarget(event?.target)) return null
  switch (event?.key) {
    case ' ':
    case 'k':
    case 'K': return 'toggle-playback'
    case 'm':
    case 'M': return 'toggle-mute'
    case 'ArrowUp': return 'volume-up'
    case 'ArrowDown': return 'volume-down'
    case 'f':
    case 'F': return 'fullscreen'
    case 't':
    case 'T': return 'theatre'
    case 'd':
    case 'D': return 'dark-mode'
    default: return null
  }
}

export function createAegisWebPlayerCommand(func, args = []) {
  const allowed = new Set(['playVideo', 'pauseVideo', 'mute', 'unMute', 'setVolume', 'getCurrentTime', 'getDuration', 'seekTo'])
  if (!allowed.has(func) || !Array.isArray(args)) return null
  if (func === 'setVolume' && (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 100)) return null
  if (func === 'setVolume' && args.length !== 1) return null
  if (func === 'seekTo' && (!Number.isInteger(args[0]) || boundedSeconds(args[0]) === null || args.length > 2 || (args.length === 2 && args[1] !== true))) return null
  if (func === 'seekTo' && args.length === 1) args = [args[0], true]
  if (['playVideo', 'pauseVideo', 'mute', 'unMute', 'getCurrentTime', 'getDuration'].includes(func) && args.length !== 0) return null
  return JSON.stringify({ event: 'command', func, args })
}

export function readAegisWebPlayerCurrentTime(message) {
  let parsed = message
  try {
    if (typeof message === 'string') parsed = JSON.parse(message)
  } catch {
    return null
  }
  return boundedSeconds(parsed?.info?.currentTime)
}

export function readAegisWebPlayerDuration(message) {
  let parsed = message
  try {
    if (typeof message === 'string') parsed = JSON.parse(message)
  } catch {
    return null
  }
  const duration = boundedSeconds(parsed?.info?.duration)
  return duration !== null && duration > 0 ? duration : null
}

function formatSeconds(value) {
  const seconds = boundedSeconds(value)
  if (seconds === null) return '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

/**
 * Build a hover cue solely from canonical, ID-derived YouTube thumbnails. This
 * is intentionally not a storyboard fetch or media request: the official
 * cross-origin player remains the sole playback surface.
 */
export function createAegisWebSeekPreview({ videoId, duration, clientX, left, width }) {
  if (!VIDEO_ID_PATTERN.test(videoId || '') || boundedSeconds(duration) === null || duration <= 0) return null
  if (!Number.isFinite(clientX) || !Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return null
  const ratio = Math.min(1, Math.max(0, (clientX - left) / width))
  const seconds = Math.min(Math.floor(duration), Math.floor(ratio * duration))
  const variant = ratio < 0.25 ? 'mq1' : ratio < 0.5 ? 'mq2' : ratio < 0.75 ? 'mq3' : 'mqdefault'
  return {
    ratio,
    seconds,
    timestamp: formatSeconds(seconds),
    thumbnail: `https://i.ytimg.com/vi/${videoId}/${variant}.jpg`,
  }
}

export function clampAegisWebPlayerVolume(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
}
