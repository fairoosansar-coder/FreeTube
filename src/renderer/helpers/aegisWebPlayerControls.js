export const AEGIS_WEB_PLAYER_MESSAGE_ORIGIN = 'https://www.youtube-nocookie.com'

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
  const allowed = new Set(['playVideo', 'pauseVideo', 'mute', 'unMute', 'setVolume', 'getCurrentTime'])
  if (!allowed.has(func)) return null
  if (func === 'setVolume' && (!Number.isInteger(args[0]) || args[0] < 0 || args[0] > 100)) return null
  return JSON.stringify({ event: 'command', func, args })
}

export function readAegisWebPlayerCurrentTime(message) {
  let parsed = message
  try {
    if (typeof message === 'string') parsed = JSON.parse(message)
  } catch {
    return null
  }
  const value = parsed?.info?.currentTime
  return Number.isFinite(value) && value >= 0 && value <= 43200 ? Math.floor(value) : null
}

export function clampAegisWebPlayerVolume(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)))
}
