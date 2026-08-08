const CHANNEL = 'aegisos:freetube:v1'
const pending = new Map()
let listenerInstalled = false
let availabilityPromise = null
let parentOrigin = null

const NATIVE_PARENT_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost'
])

function isAllowedParentOrigin(origin) {
  if (NATIVE_PARENT_ORIGINS.has(origin)) return true
  if (process.env.NODE_ENV === 'production') return false

  try {
    const url = new URL(origin)
    return url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

function requestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function installListener() {
  if (listenerInstalled || window.parent === window) return
  listenerInstalled = true

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const message = event.data
    if (!message || message.channel !== CHANNEL || typeof message.id !== 'string') return

    const entry = pending.get(message.id)
    if (!entry || message.type !== entry.responseType) return
    if (message.type === 'probe-result') {
      if (!isAllowedParentOrigin(event.origin)) return
      parentOrigin = event.origin
    } else if (parentOrigin === null || event.origin !== parentOrigin) {
      return
    }
    pending.delete(message.id)
    window.clearTimeout(entry.timeout)
    entry.resolve(message)
  })
}

function sendToParent(type, responseType, payload, timeoutMs) {
  installListener()

  return new Promise((resolve, reject) => {
    if (type !== 'probe' && parentOrigin === null) {
      reject(new Error('AegisOS FreeTube bridge has no trusted parent'))
      return
    }
    const id = requestId()
    const timeout = window.setTimeout(() => {
      pending.delete(id)
      reject(new Error('AegisOS FreeTube bridge timed out'))
    }, timeoutMs)

    pending.set(id, { responseType, resolve, timeout })
    window.parent.postMessage(
      { channel: CHANNEL, type, id, ...payload },
      type === 'probe' ? '*' : parentOrigin
    )
  })
}

async function hasNativeProxy() {
  if (window.parent === window) return false
  if (!availabilityPromise) {
    availabilityPromise = sendToParent('probe', 'probe-result', {}, 900)
      .then(message => message.available === true)
      .catch(() => false)
  }
  return await availabilityPromise
}

/**
 * Ask the trusted AegisOS parent to perform an Invidious request natively.
 * Returns null outside the installed AegisOS shell so normal web fetching can
 * continue as a best-effort fallback.
 * @param {string | URL} input
 * @returns {Promise<Response | null>}
 */
export async function fetchThroughAegisProxy(input) {
  if (!(await hasNativeProxy())) return null

  const url = new URL(input)
  if (!url.pathname.startsWith('/api/v1/')) {
    return null
  }

  const message = await sendToParent(
    'request',
    'response',
    { path: `${url.pathname}${url.search}`, origin: url.origin },
    30_000
  )

  if (message.ok !== true || typeof message.body !== 'string') {
    throw new Error(typeof message.error === 'string' ? message.error : 'AegisOS native video service failed')
  }

  return new Response(message.body, {
    status: Number.isInteger(message.status) ? message.status : 200,
    headers: {
      'content-type': typeof message.contentType === 'string'
        ? message.contentType
        : 'application/json',
      'x-aegisos-invidious-instance': typeof message.instance === 'string'
        ? message.instance
        : ''
    }
  })
}
