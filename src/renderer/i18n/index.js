import { createI18n } from 'vue-i18n'
import { createWebURL } from '../helpers/utils'
// List of locales approved for use
import activeLocales from '../../../static/locales/activeLocales.json'

// These messages describe the running application, rather than the upstream
// project, its data format, documentation, or credits. Keep the locale keys
// stable for FreeTube compatibility and brand only their values in AegisOS.
const AEGISTUBE_MESSAGE_PATHS = [
  ['Settings', 'General Settings', 'Open Deep Links In New Window'],
  ['Settings', 'Theme Settings', 'Hide FreeTube Header Logo'],
  ['Settings', 'Proxy Settings', 'Proxy Warning'],
  ['Channel', 'This channel is age-restricted and currently cannot be viewed in FreeTube.'],
  ['Channel', 'Posts', 'Video hidden by FreeTube'],
  ['Video', 'MembersOnly'],
  ['Video', 'AgeRestricted'],
  ['Video', 'DRMProtected'],
  ['Video', 'Private'],
  ['Tooltips', 'General Settings', 'Preferred API Backend'],
  ['Tooltips', 'General Settings', 'Fallback to Non-Preferred Backend on Failure'],
  ['Tooltips', 'General Settings', 'Thumbnail Preference'],
  ['Tooltips', 'General Settings', 'Invidious Instance'],
  ['Tooltips', 'General Settings', 'External Link Handling'],
  ['Tooltips', 'General Settings', 'Open Deep Links In New Window'],
  ['Tooltips', 'External Player Settings', 'Custom External Player Executable'],
  ['Tooltips', 'Distraction Free Settings', 'Hide Videos, Playlists and Channels Containing Text'],
  ['Tooltips', 'Subscription Settings', 'Fetch Feeds from RSS'],
  ['Tooltips', 'Subscription Settings', 'Fetch Automatically'],
]
const LOCALIZED_FREETUBE_NAME = /free\s*tube|ஃப்ரீட்யூப்|فری\s*ٹیوب/giu

function applyAegisTubeProductName(messages) {
  if (!process.env.AEGISOS_WEB_EDITION) return messages

  for (const path of AEGISTUBE_MESSAGE_PATHS) {
    let parent = messages
    for (const segment of path.slice(0, -1)) {
      parent = parent?.[segment]
      if (!parent || typeof parent !== 'object') break
    }
    const key = path[path.length - 1]
    if (parent && key && typeof parent[key] === 'string') {
      parent[key] = parent[key].replaceAll(LOCALIZED_FREETUBE_NAME, 'AegisTube')
    }
  }
  return messages
}

const i18n = createI18n({
  locale: 'en-US',
  legacy: false,
  fallbackLocale: {
    // https://vue-i18n.intlify.dev/guide/essentials/fallback.html

    // es-AR -> es -> en-US
    'es-AR': ['es'],
    // es-MX -> es -> en-US
    'es-MX': ['es'],
    // pt-BR -> pt -> en-US
    'pt-BR': ['pt'],
    // pt-PT -> pt -> en-US
    'pt-PT': ['pt'],
    // any -> en-US
    default: ['en-US'],
  }
})

export async function loadLocale(locale) {
  // don't need to load it if it's already loaded
  if (i18n.global.availableLocales.includes(locale) &&
    Object.keys(i18n.global.messages.value[locale]).length > 0) {
    return
  }
  if (!activeLocales.includes(locale)) {
    console.error(`Unable to load unknown locale: "${locale}"`)
    return
  }

  let path

  // locales are only compressed in our production Electron builds
  if (process.env.IS_ELECTRON && process.env.NODE_ENV !== 'development') {
    path = `/static/locales/${locale}.json.br`
  } else {
    path = `/static/locales/${locale}.json`
  }

  const url = createWebURL(path)

  const response = await fetch(url)
  const data = applyAegisTubeProductName(await response.json())
  i18n.global.setLocaleMessage(locale, data)
}

// Set by _scripts/ProcessLocalesPlugin.js
if (process.env.HOT_RELOAD_LOCALES) {
  const websocket = new WebSocket('ws://localhost:9080/ws')

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data)

    if (message.type === 'freetube-locale-update') {
      for (const [locale, data] of message.data) {
        // Only update locale data if it was already loaded
        if (i18n.global.availableLocales.includes(locale) &&
          Object.keys(i18n.global.messages.value[locale]).length > 0) {
          const localeData = applyAegisTubeProductName(JSON.parse(data))

          i18n.global.setLocaleMessage(locale, localeData)
        }
      }
    }
  }
}

export default i18n
