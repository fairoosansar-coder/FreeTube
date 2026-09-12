import assert from 'node:assert/strict'
import {
  AEGIS_MANAGED_METADATA_ORIGIN,
  canUseAegisManagedMetadata,
  createAegisManagedMetadataUrl,
} from '../src/renderer/helpers/aegisManagedMetadata.js'

let count = 0

function test(name, fn) {
  try {
    fn()
    count += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}

test('managed metadata uses the fixed AegisOS origin', () => {
  assert.equal(AEGIS_MANAGED_METADATA_ORIGIN, 'https://os.aegisos.me')
  assert.equal(createAegisManagedMetadataUrl({ resource: 'popular', params: {} }).toString(), 'https://os.aegisos.me/api/aegistube/v1/popular')
})
test('search and suggestions have bounded fixed endpoint shapes', () => {
  assert.equal(createAegisManagedMetadataUrl({ resource: 'search', params: { q: 'AegisOS', page: 2 } }).toString(), 'https://os.aegisos.me/api/aegistube/v1/search?q=AegisOS&page=2')
  assert.equal(createAegisManagedMetadataUrl({ resource: 'search/suggestions', params: { q: 'AegisTube' } }).toString(), 'https://os.aegisos.me/api/aegistube/v1/suggestions?q=AegisTube')
})
test('managed discovery includes authenticated native bridge calls but excludes non-discovery operations', () => {
  assert.equal(canUseAegisManagedMetadata({ resource: 'popular', id: '', subResource: '', webEdition: true, nativeBridge: false }), true)
  assert.equal(canUseAegisManagedMetadata({ resource: 'videos', id: 'dQw4w9WgXcQ', subResource: '', webEdition: true, nativeBridge: false }), false)
  assert.equal(canUseAegisManagedMetadata({ resource: 'popular', id: '', subResource: '', webEdition: true, nativeBridge: true }), true)
  assert.equal(canUseAegisManagedMetadata({ resource: 'popular', id: '', subResource: '', webEdition: false, nativeBridge: false }), false)
})
test('unsupported resources cannot be converted into service paths', () => {
  assert.throws(() => createAegisManagedMetadataUrl({ resource: 'proxy', params: {} }), /Unsupported/)
})

console.log(`PASS ${count} deterministic managed-metadata fixtures`)
if (process.exitCode) process.exit(process.exitCode)
