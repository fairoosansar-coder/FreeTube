const CHANNEL = 'aegisos:freetube:v1'
const SUPPORTED_BRIDGE_VERSIONS = new Set(['v2', 'v3'])
const LOCAL_EXTRACTOR_BRIDGE_VERSION = 'v3'
const OPAQUE_ORIGIN = 'null'
const pending = new Map()
let listenerInstalled = false
let proxyConfigPromise = null
let parentOrigin = null
let parentTargetOrigin = null

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
  'https://tauri.localhost'
])

function isAllowedParentOrigin(origin) {
  if (NATIVE_PARENT_ORIGINS.has(origin)) return true
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

function installListener() {
  if (listenerInstalled || window.parent === window) return
  listenerInstalled = true

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return
    const message = event.data
    if (!message || message.channel !== CHANNEL || typeof message.id !== 'string') return
    if (expectsNativeBridge && message.token !== bridgeToken) return

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
  if (!proxyConfigPromise) {
    proxyConfigPromise = probeNativeProxyConfig()
  }
  const config = await proxyConfigPromise
  if (config === null) proxyConfigPromise = null
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
      throw new Error('AegisOS native video bridge did not answer. Reload FreeTube to reconnect it.')
    }
    return null
  }
  if (!approvedOrigins.includes(url.origin)) {
    throw new Error('FreeTube selected a video service that the installed AegisOS relay does not approve')
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
      throw new Error('AegisOS native YouTube bridge did not answer. Reload FreeTube to reconnect it.')
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
