import { base64EncodeUtf8, createWebURL, fetchWithTimeout } from '../../helpers/utils'
import { getAegisProxyOrigins } from '../../helpers/aegisBridge'
import {
  createProviderCapabilityState,
  nextProviderCapabilityState,
  selectDeterministicProvider,
} from '../../helpers/aegisReliability'

const state = {
  currentInvidiousInstance: '',
  currentInvidiousInstanceAuthorization: null,
  currentInvidiousInstanceUrl: '',
  invidiousInstancesList: null,
  invidiousProviderCapabilities: {}
}

function normalizedOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

const getters = {
  getCurrentInvidiousInstance(state) {
    return state.currentInvidiousInstance
  },

  getCurrentInvidiousInstanceUrl(state) {
    return state.currentInvidiousInstanceUrl
  },

  getCurrentInvidiousInstanceAuthorization(state) {
    return state.currentInvidiousInstanceAuthorization
  },

  getInvidiousInstancesList(state) {
    return state.invidiousInstancesList
  },

  getInvidiousProviderCapabilities(state) {
    return state.invidiousProviderCapabilities
  }
}

const actions = {
  async fetchInvidiousInstancesFromFile({ commit, dispatch }) {
    const url = createWebURL('/static/invidious-instances.json')
    const proxyOrigins = process.env.AEGISOS_WEB_EDITION
      ? await getAegisProxyOrigins()
      : null

    const fileData = await (await fetch(url)).json()
    const instances = fileData.filter(e => {
      const origin = e.url.replace(/\/$/, '')
      return (process.env.SUPPORTS_LOCAL_API || e.cors) &&
        (proxyOrigins === null || proxyOrigins.includes(origin))
    }).map(e => {
      return e.url
    })

    commit('setInvidiousInstancesList', instances)
    if (process.env.AEGISOS_WEB_EDITION) {
      dispatch('reconcileCurrentInvidiousInstance')
    }
  },

  /// fetch invidious instances from site and overwrite static file.
  async fetchInvidiousInstances({ commit, dispatch }) {
    const requestUrl = 'https://api.invidious.io/instances.json'
    const timeout = process.env.AEGISOS_WEB_EDITION ? 6_000 : 15_000
    const proxyOrigins = process.env.AEGISOS_WEB_EDITION
      ? await getAegisProxyOrigins()
      : null
    try {
      const response = await fetchWithTimeout(timeout, requestUrl)
      if (!response.ok) {
        throw new Error(`Invidious instance directory returned HTTP ${response.status}`)
      }
      const json = await response.json()
      const instances = json.filter((instance) => {
        return !(instance[0].includes('.onion') ||
          instance[0].includes('.i2p') ||
          !instance[1].api ||
          (!process.env.SUPPORTS_LOCAL_API && !instance[1].cors))
      }).map((instance) => {
        return instance[1].uri.replace(/\/$/, '')
      }).filter((origin) => {
        return proxyOrigins === null || proxyOrigins.includes(origin)
      })

      if (instances.length !== 0) {
        commit('setInvidiousInstancesList', instances)
        if (process.env.AEGISOS_WEB_EDITION) {
          dispatch('reconcileCurrentInvidiousInstance')
        }
      } else {
        console.warn('using static file for invidious instances')
      }
    } catch (err) {
      if (err.name === 'TimeoutError') {
        console.error(`Fetching the Invidious instance list timed out after ${timeout / 1000} seconds. Falling back to local copy.`)
      } else {
        console.error(err)
      }
    }
  },

  setRandomCurrentInvidiousInstance({ commit, state }) {
    const instanceList = state.invidiousInstancesList
    const instance = Array.isArray(instanceList)
      ? selectDeterministicProvider(instanceList, state.invidiousProviderCapabilities)
      : ''

    commit('setCurrentInvidiousInstance', instance)
    return instance
  },

  setNextCurrentInvidiousInstance({ commit, state }, input) {
    const failedInstance = typeof input === 'string' ? input : input.failedInstance
    const capability = typeof input === 'string' ? 'discovery' : input.capability
    const instanceList = Array.isArray(state.invidiousInstancesList)
      ? state.invidiousInstancesList
      : []
    const instance = selectDeterministicProvider(
      instanceList,
      state.invidiousProviderCapabilities,
      failedInstance,
      capability
    )

    if (instance !== '') {
      commit('setCurrentInvidiousInstance', instance)
    }
    return instance
  },

  recordInvidiousProviderCapability({ commit, state }, payload) {
    const previous = state.invidiousProviderCapabilities[payload.origin] ?? createProviderCapabilityState()
    commit('setInvidiousProviderCapability', {
      origin: payload.origin,
      state: nextProviderCapabilityState(previous, payload)
    })
  },

  reconcileCurrentInvidiousInstance({ commit, state }) {
    const instanceList = Array.isArray(state.invidiousInstancesList)
      ? state.invidiousInstancesList
      : []
    const currentOrigin = normalizedOrigin(state.currentInvidiousInstanceUrl)
    const currentIsApproved = currentOrigin !== '' && instanceList.some(instance => {
      return normalizedOrigin(instance) === currentOrigin
    })

    if (currentIsApproved) {
      return state.currentInvidiousInstanceUrl
    }

    const instance = instanceList[0] ?? ''
    commit('setCurrentInvidiousInstance', instance)
    return instance
  }
}

const mutations = {
  setCurrentInvidiousInstance(state, value) {
    state.currentInvidiousInstance = value

    let url
    try {
      url = new URL(value)
    } catch { }

    let authorization = null

    if (url && (url.username.length > 0 || url.password.length > 0)) {
      authorization = `Basic ${base64EncodeUtf8(`${url.username}:${url.password}`)}`
    }

    state.currentInvidiousInstanceAuthorization = authorization

    let instanceUrl

    if (url && authorization) {
      url.username = ''
      url.password = ''

      instanceUrl = url.toString().replace(/\/$/, '')
    } else {
      instanceUrl = value
    }

    state.currentInvidiousInstanceUrl = instanceUrl

    if (process.env.IS_ELECTRON) {
      if (authorization) {
        window.ftElectron.setInvidiousAuthorization(authorization, instanceUrl)
      } else {
        window.ftElectron.clearInvidiousAuthorization()
      }
    }
  },

  setInvidiousInstancesList(state, value) {
    state.invidiousInstancesList = value
    const next = {}
    for (const origin of value ?? []) {
      next[origin] = state.invidiousProviderCapabilities[origin] ?? createProviderCapabilityState()
    }
    state.invidiousProviderCapabilities = next
  },

  setInvidiousProviderCapability(state, { origin, state: capability }) {
    state.invidiousProviderCapabilities = {
      ...state.invidiousProviderCapabilities,
      [origin]: capability
    }
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
