const CHANNEL = 'aegisos:freetube:v1'
const SUPPORTED_BRIDGE_VERSIONS = new Set(['v2', 'v3'])
const LOCAL_EXTRACTOR_BRIDGE_VERSION = 'v3'
const OPAQUE_ORIGIN = 'null'
const pending = new Map()
const shellEventListeners = new Map()
let listenerInstalled = false
let proxyConfigPromise = null
let proxyConfigRetryAfter = 0
let parentOrigin = null
let parentTargetOrigin = null
let shellContext = null

const bridgeHashQuery = window.location.hash.indexOf('?')
const bridgeParams = bridgeHashQuery === -1
  ? new URLSearchParams()
  : new URLSearchParams(window.location.hash.slice(bridgeHashQuery + 1))
const requestedBridgeVersion = bridgeParams.get('aegisBridge')
const bridgeToken = bridgeParams.get('aegisBridgeToken')
const expectsNativeBridge = SUPPORTED_BRIDGE_VERSIONS.has(requestedBridgeVersion) &&
  typeof bridgeToken === 'string' &&
  bridgeToken.length >= 16 &&
  bridgeToken.length <= 128

export function isAegisNativeBridgeExpected() {
  return expectsNativeBridge
}

/**
 * Bridge v2 remains supported for older installed shells and their Invidious
 * relay. Only v3 advertises the native JSON transport required by youtubei.js.
 */
export function isAegisNativeExtractorExpected() {
  return expectsNativeBridge && requestedBridgeVersion === LOCAL_EXTRACTOR_BRIDGE_VERSION
}

const NATIVE_PARENT_ORIGINS = new Set([
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
  // Tauri's development window uses this exact Vite origin while embedding
  // the same production AegisTube payload as a release build. It is accepted
  // only when the frame also carries the short-lived AegisOS bridge token.
  'http://localhost:3000'
])

function isAllowedParentOrigin(origin) {
  if (NATIVE_PARENT_ORIGINS.has(origin)) {
    return origin !== 'http://localhost:3000' || expectsNativeBridge
  }
  // WKWebView can serialize a non-HTTP custom-protocol parent as an opaque
  // origin. The per-frame token and exact event.source check authenticate that
  // parent without granting trust to unrelated opaque frames.
  if (expectsNativeBridge && origin === OPAQUE_ORIGIN) return true
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

function notifyShellEvent(type, payload) {
  const listeners = shellEventListeners.get(type)
  if (!listeners) return

  for (const listener of listeners) {
    try {
      listener(payload)
    } catch (error) {
      console.error(`AegisTube shell event listener failed for ${type}`, error)
    }
  }
}

function rememberShellContext(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return
  shellContext = Object.freeze({ ...value })
  notifyShellEvent('shell-context', shellContext)
}

function installListener() {
  if (listenerInstalled || window.parent === window) return
  listenerInstalled = true

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const message = event.data
    if (!message || message.channel !== CHANNEL || typeof message.id !== 'string') return
    if (expectsNativeBridge && message.token !== bridgeToken) return

    const isTrustedShellEvent = message.type === 'shell-context' || message.type === 'navigate'
    if (isTrustedShellEvent) {
      if (parentOrigin === null || event.origin !== parentOrigin) return
      if (message.id.length === 0 || message.id.length > 128) return

      if (message.type === 'shell-context') {
        rememberShellContext(message.context)
      } else {
        notifyShellEvent('navigate', message)
      }
      return
    }

    const entry = pending.get(message.id)
    if (!entry || message.type !== entry.responseType) return
    if (message.type === 'probe-result') {
      if (!isAllowedParentOrigin(event.origin)) return
      parentOrigin = event.origin
      // A custom or opaque protocol cannot be used reliably as targetOrigin in
      // every WebKit release. Messages still go only to window.parent and are
      // bound to the unguessable per-frame token.
      parentTargetOrigin = event.origin === OPAQUE_ORIGIN || event.origin === 'tauri://localhost'
        ? '*'
        : event.origin
      rememberShellContext(message.shellContext)
    } else if (parentOrigin === null || event.origin !== parentOrigin) {
      return
    }
    pending.delete(message.id)
    window.clearTimeout(entry.timeout)
    entry.resolve(message)
  })
}

/**
 * Subscribe to authenticated, unsolicited shell events from the AegisOS
 * parent. Unlike request responses, these events are accepted only after the
 * probe has pinned the exact parent window, origin, and per-frame token.
 *
 * @param {'shell-context' | 'navigate'} type
 * @param {(payload: any) => void} listener
 * @returns {() => void}
 */
export function subscribeToAegisShellEvent(type, listener) {
  if (type !== 'shell-context' && type !== 'navigate') {
    throw new Error(`Unsupported AegisOS shell event: ${type}`)
  }
  installListener()
  let listeners = shellEventListeners.get(type)
  if (!listeners) {
    listeners = new Set()
    shellEventListeners.set(type, listeners)
  }
  listeners.add(listener)
  if (type === 'shell-context' && shellContext !== null) {
    listener(shellContext)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) shellEventListeners.delete(type)
  }
}

/**
 * Emit a one-way lifecycle event to the already authenticated AegisOS parent.
 * Events intentionally have no response and never create a pending request.
 *
 * @param {'app-ready' | 'route-change' | 'boot-status'} type
 * @param {Record<string, unknown>} [payload]
 * @returns {boolean}
 */
export function emitAegisShellEvent(type, payload = {}) {
  if (!expectsNativeBridge || parentOrigin === null || window.parent === window) return false
  if (!['app-ready', 'route-change', 'boot-status'].includes(type)) return false

  window.parent.postMessage({
    channel: CHANNEL,
    type,
    id: requestId(),
    token: bridgeToken,
    ...payload,
  }, parentTargetOrigin)
  return true
}

function sendToParent(type, responseType, payload, timeoutMs) {
  installListener()

  return new Promise((resolve, reject) => {
    if (type !== 'probe' && parentOrigin === null) {
      reject(new Error('The AegisTube bridge has no trusted AegisOS parent'))
      return
    }
    const id = requestId()
    const timeout = window.setTimeout(() => {
      pending.delete(id)
      reject(new Error('The AegisTube bridge timed out'))
    }, timeoutMs)

    pending.set(id, { responseType, resolve, timeout })
    window.parent.postMessage(
      {
        channel: CHANNEL,
        type,
        id,
        ...(expectsNativeBridge ? { token: bridgeToken } : {}),
        ...payload
      },
      type === 'probe' ? '*' : parentTargetOrigin
    )
  })
}

function wait(delayMs) {
  return new Promise(resolve => window.setTimeout(resolve, delayMs))
}

async function probeNativeProxyConfig() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const message = await sendToParent('probe', 'probe-result', {}, 2_500)
      if (message.available === true && Array.isArray(message.origins)) {
        const origins = message.origins.filter(origin => {
          if (typeof origin !== 'string') return false
          try {
            const url = new URL(origin)
            return url.protocol === 'https:' && url.origin === origin
          } catch {
            return false
          }
        })
        return { origins }
      }
    } catch { }

    if (attempt < 2) {
      await wait(200 * (attempt + 1))
    }
  }
  return null
}

async function getNativeProxyConfig() {
  if (window.parent === window) return null
  if (proxyConfigRetryAfter > Date.now()) return null
  if (!proxyConfigPromise) {
    proxyConfigPromise = probeNativeProxyConfig()
  }
  const config = await proxyConfigPromise
  if (config === null) {
    // Avoid replaying the bounded three-attempt handshake for every startup
    // data source when the parent is unavailable. Later user activity can
    // retry after this short negative-cache window.
    proxyConfigRetryAfter = Date.now() + 15_000
    proxyConfigPromise = null
  } else {
    proxyConfigRetryAfter = 0
  }
  return config
}

/**
 * Return the installed relay's approved origins, or null outside AegisOS.
 * @returns {Promise<string[] | null>}
 */
export async function getAegisProxyOrigins() {
  const config = await getNativeProxyConfig()
  return config === null ? null : config.origins
}

/**
 * Ask the trusted AegisOS parent to perform an Invidious request natively.
 * Returns null outside the installed AegisOS shell so normal web fetching can
 * continue as a best-effort fallback.
 * @param {string | URL} input
 * @returns {Promise<Response | null>}
 */
export async function fetchThroughAegisProxy(input) {
  const url = new URL(input)
  if (!url.pathname.startsWith('/api/v1/')) {
    return null
  }
  const approvedOrigins = await getAegisProxyOrigins()
  if (approvedOrigins === null) {
    if (expectsNativeBridge) {
      throw new Error('AegisOS native video bridge did not answer. Reload AegisTube to reconnect it.')
    }
    return null
  }
  if (!approvedOrigins.includes(url.origin)) {
    throw new Error('AegisTube selected a video service that the installed AegisOS relay does not approve')
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

/**
 * Ask the authenticated native AegisOS parent to fetch one fixed managed
 * discovery operation. Rust independently validates operation, parameters,
 * response bounds, JSON, and timeout before the child receives a response.
 * @param {string | URL} input
 * @returns {Promise<Response | null>}
 */
export async function fetchManagedMetadataThroughAegisBridge(input) {
  const url = new URL(input)
  if (url.origin !== 'https://os.aegisos.me' || !url.pathname.startsWith('/api/aegistube/v1/')) {
    return null
  }
  if (!expectsNativeBridge) return null

  const config = await getNativeProxyConfig()
  if (config === null) {
    throw new Error('AegisOS native metadata bridge did not answer. Reload AegisTube to reconnect it.')
  }
  const message = await sendToParent(
    'managed-metadata-request',
    'response',
    { path: `${url.pathname}${url.search}` },
    30_000
  )
  if (message.ok !== true || typeof message.body !== 'string') {
    throw new Error(typeof message.error === 'string' ? message.error : 'AegisOS managed metadata service failed')
  }
  return new Response(message.body, {
    status: Number.isInteger(message.status) ? message.status : 200,
    headers: {
      'content-type': typeof message.contentType === 'string'
        ? message.contentType
        : 'application/json'
    }
  })
}

/**
 * Route FreeTube's unauthenticated Innertube JSON POSTs through the installed
 * AegisOS shell. The native side independently enforces the exact YouTube
 * origin, path family, method, headers, and body/response limits.
 *
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 * @returns {Promise<Response | null>}
 */
export async function fetchThroughAegisInnertube(input, init = undefined) {
  if (!isAegisNativeExtractorExpected()) {
    return null
  }

  const request = new Request(input, init)
  const url = new URL(request.url)
  if (url.origin !== 'https://www.youtube.com' || !url.pathname.startsWith('/youtubei/v1/')) {
    return null
  }
  if (request.method !== 'POST') {
    if (expectsNativeBridge) {
      throw new Error('AegisOS supports only YouTube Innertube JSON POST requests')
    }
    return null
  }

  const config = await getNativeProxyConfig()
  if (config === null) {
    if (expectsNativeBridge) {
      throw new Error('AegisOS native YouTube bridge did not answer. Reload AegisTube to reconnect it.')
    }
    return null
  }

  const body = await request.clone().text()
  const headers = Object.fromEntries(request.headers.entries())
  const message = await sendToParent(
    'youtube-request',
    'response',
    { url: request.url, method: request.method, headers, body },
    30_000
  )

  if (message.ok !== true || typeof message.body !== 'string') {
    throw new Error(typeof message.error === 'string' ? message.error : 'AegisOS native YouTube request failed')
  }

  return new Response(message.body, {
    status: Number.isInteger(message.status) ? message.status : 200,
    headers: {
      'content-type': typeof message.contentType === 'string'
        ? message.contentType
        : 'application/json'
    }
  })
}

/**
 * Keep links opened by the embedded client inside the AegisOS Browser app.
 * Returns false for the optional hosted edition, where normal browser tabs
 * remain appropriate.
 *
 * @param {string} input
 * @returns {Promise<boolean>}
 */
export async function openLinkThroughAegisShell(input) {
  if (!expectsNativeBridge) return false
  if (typeof input !== 'string' || input.length === 0 || input.length > 2048) {
    throw new Error('AegisTube blocked an invalid link')
  }

  const url = new URL(input)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('AegisTube permits only safe web links')
  }

  const message = await sendToParent(
    'open-link',
    'open-link-result',
    { url: url.toString() },
    5_000
  )
  if (message.ok !== true) {
    throw new Error(typeof message.error === 'string' ? message.error : 'AegisOS could not open this link')
  }
  return true
}
