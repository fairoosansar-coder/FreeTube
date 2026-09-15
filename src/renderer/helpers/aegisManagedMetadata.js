export const AEGIS_MANAGED_METADATA_ORIGIN = 'https://os.aegisos.me'
const AEGIS_MANAGED_METADATA_PATH = '/api/aegistube/v1'
const AEGIS_MANAGED_METADATA_RESOURCES = new Map([
  ['popular', 'popular'],
  ['search', 'search'],
  ['search/suggestions', 'suggestions'],
])

function isNullOrEmpty(value) {
  return value === null || value === undefined || value === ''
}

export function canUseAegisManagedMetadata({ resource, id, subResource, webEdition, nativeBridge }) {
  return webEdition &&
    (nativeBridge === true || nativeBridge === false) &&
    id === '' &&
    isNullOrEmpty(subResource) &&
    AEGIS_MANAGED_METADATA_RESOURCES.has(resource)
}

/** Keep native playback local while routing fixed discovery operations through the managed edge. */
export function selectAegisDiscoveryBackend({ webEdition, nativeExtractor, savedPreference }) {
  return webEdition && nativeExtractor ? 'invidious' : savedPreference
}

/** Keep asynchronous managed autocomplete visible only while its exact input remains active. */
export function shouldOpenAegisAsyncSuggestions({ isAegisTube, isSearchInput, inputFocused, query, resultCount }) {
  return isAegisTube === true &&
    isSearchInput === true &&
    inputFocused === true &&
    typeof query === 'string' &&
    query.trim().length > 0 &&
    Number.isInteger(resultCount) &&
    resultCount > 0
}

export function createAegisManagedMetadataUrl({ resource, params }) {
  const operation = AEGIS_MANAGED_METADATA_RESOURCES.get(resource)
  if (!operation) throw new Error(`Unsupported AegisTube managed metadata resource: ${resource}`)
  const url = new URL(`${AEGIS_MANAGED_METADATA_PATH}/${operation}`, AEGIS_MANAGED_METADATA_ORIGIN)
  if (resource === 'search' || resource === 'search/suggestions') {
    url.searchParams.set('q', params.q ?? '')
  }
  if (resource === 'search') {
    url.searchParams.set('page', String(params.page ?? 1))
  }
  if (params.region) url.searchParams.set('region', params.region)
  return url
}
