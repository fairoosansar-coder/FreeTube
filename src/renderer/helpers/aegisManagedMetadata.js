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
    !nativeBridge &&
    id === '' &&
    isNullOrEmpty(subResource) &&
    AEGIS_MANAGED_METADATA_RESOURCES.has(resource)
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
