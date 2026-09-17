<template>
  <section class="aegisWebLibrary" aria-labelledby="aegis-web-library-heading">
    <header class="libraryHeader">
      <div>
        <p class="eyebrow">AegisTube web</p>
        <h1 id="aegis-web-library-heading">{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <div class="headerActions">
        <button type="button" @click="downloadBackup('json')">Export JSON</button>
        <button type="button" @click="downloadBackup('csv')">Export CSV</button>
        <button v-if="items.length > 0 && collection !== 'folders'" type="button" class="clearButton" @click="clearItems">Clear {{ title.toLowerCase() }}</button>
      </div>
    </header>

    <template v-if="collection !== 'folders'">
      <div v-if="items.length === 0" class="emptyState">
        <FontAwesomeIcon :icon="collection === 'favorites' ? ['fas', 'heart'] : ['fas', 'history']" />
        <h2>{{ collection === 'favorites' ? 'No favorites yet' : 'No watch history yet' }}</h2>
        <p>{{ collection === 'favorites' ? 'Use the heart on a video card or player to save it here.' : 'Videos you open in AegisTube web stay on this device.' }}</p>
        <RouterLink to="/popular">Explore videos</RouterLink>
      </div>
      <ol v-else class="libraryGrid">
        <li v-for="item in items" :key="item.videoId" class="libraryCard">
          <RouterLink :to="`/watch/${item.videoId}`" class="cardLink" @click="recordVisit(item)">
            <img :src="item.thumbnail" alt="" loading="lazy">
            <span class="cardBody"><strong>{{ item.title || `Video ${item.videoId}` }}</strong><small v-if="item.author">{{ item.author }}</small></span>
          </RouterLink>
          <div class="cardFooter"><time :datetime="new Date(activityTime(item)).toISOString()">{{ displayTime(item) }}</time><button type="button" @click="removeItem(item.videoId)">Remove</button></div>
        </li>
      </ol>
      <RouterLink v-if="collection === 'favorites'" class="manageFoldersLink" to="/library/folders">Organize favorites in folders</RouterLink>
    </template>

    <template v-else>
      <div class="folderComposer">
        <label for="aegis-web-folder-name">New folder or playlist</label>
        <div><input id="aegis-web-folder-name" v-model="newFolderName" maxlength="80" placeholder="e.g. Research" @keyup.enter="createFolder"><button type="button" @click="createFolder">Create</button></div>
        <p>Folders stay on this browser and can contain only videos already saved to Favorites.</p>
      </div>
      <div v-if="library.folders.length === 0" class="emptyState">
        <FontAwesomeIcon :icon="['fas', 'folder']" />
        <h2>No folders yet</h2>
        <p>Create a folder, then organize the videos in your local Favorites list.</p>
        <RouterLink to="/library/favorites">Open favorites</RouterLink>
      </div>
      <div v-else class="folderWorkspace">
        <ol class="folderList" aria-label="Saved folders">
          <li v-for="folder in library.folders" :key="folder.id">
            <button type="button" :class="{ selected: selectedFolderId === folder.id }" @click="selectedFolderId = folder.id"><FontAwesomeIcon :icon="['fas', 'folder']" /> {{ folder.name }} <small>{{ folder.videoIds.length }}</small></button>
          </li>
        </ol>
        <section v-if="selectedFolder" class="folderDetails" :aria-labelledby="`folder-${selectedFolder.id}`">
          <div class="folderTitleRow"><h2 :id="`folder-${selectedFolder.id}`">{{ selectedFolder.name }}</h2><button type="button" class="dangerButton" @click="deleteFolder">Delete folder</button></div>
          <div class="renameRow"><label :for="`rename-${selectedFolder.id}`">Rename</label><input :id="`rename-${selectedFolder.id}`" v-model="selectedFolderName" maxlength="80" @keyup.enter="renameFolder"><button type="button" @click="renameFolder">Save</button></div>
          <p class="folderHelp">Select saved favorites to include in this folder. Removing a favorite also removes only its local folder memberships.</p>
          <p v-if="library.favorites.length === 0" class="emptyFolderMessage">Save a favorite first, then return here to organize it.</p>
          <ul v-else class="membershipList">
            <li v-for="item in library.favorites" :key="item.videoId">
              <label><input type="checkbox" :checked="selectedFolder.videoIds.includes(item.videoId)" @change="toggleMember(item.videoId)"><img :src="item.thumbnail" alt=""><span><strong>{{ item.title || `Video ${item.videoId}` }}</strong><small v-if="item.author">{{ item.author }}</small></span></label>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRoute } from 'vue-router'
import {
  clearAegisWebLibraryCollection,
  createAegisWebFolder,
  deleteAegisWebFolder,
  readAegisWebLibrary,
  recordAegisWebHistory,
  removeAegisWebLibraryEntry,
  renameAegisWebFolder,
  triggerAegisWebLibraryDownload,
  toggleAegisWebFolderMembership,
} from '../../helpers/aegisWebLibrary.js'

const route = useRoute()
const library = ref(readAegisWebLibrary())
const newFolderName = ref('')
const selectedFolderId = ref('')
const selectedFolderName = ref('')
const collection = computed(() => ['favorites', 'history', 'folders'].includes(route.params.collection) ? route.params.collection : 'history')
const title = computed(() => ({ favorites: 'Favorites', history: 'Watch history', folders: 'Folders & playlists' })[collection.value])
const subtitle = computed(() => ({
  favorites: 'Saved on this browser. No account, video bytes, stream URL, or credentials are stored.',
  history: 'Saved on this browser from AegisTube web visits. Remove individual entries or clear the list anytime.',
  folders: 'Organize favorites on this browser. Export a portable backup at any time; nothing is uploaded.',
}[collection.value]))
const items = computed(() => collection.value === 'folders' ? library.value.folders : library.value[collection.value])
const selectedFolder = computed(() => library.value.folders.find((folder) => folder.id === selectedFolderId.value) ?? null)

watch(collection, () => { refresh() })
watch(selectedFolder, (folder) => { selectedFolderName.value = folder?.name ?? '' })

function refresh() {
  library.value = readAegisWebLibrary()
  if (selectedFolderId.value === '' || !library.value.folders.some((folder) => folder.id === selectedFolderId.value)) selectedFolderId.value = library.value.folders[0]?.id ?? ''
}
function recordVisit(item) { library.value = recordAegisWebHistory(item) }
function removeItem(videoId) { library.value = removeAegisWebLibraryEntry(collection.value, videoId); refresh() }
function clearItems() { library.value = clearAegisWebLibraryCollection(collection.value); refresh() }
function activityTime(item) { return collection.value === 'favorites' ? item.savedAt : item.watchedAt }
function displayTime(item) { return new Date(activityTime(item)).toLocaleString() }
function createFolder() { library.value = createAegisWebFolder(newFolderName.value); newFolderName.value = ''; refresh() }
function renameFolder() { if (selectedFolder.value) library.value = renameAegisWebFolder(selectedFolder.value.id, selectedFolderName.value); refresh() }
function deleteFolder() { if (selectedFolder.value) library.value = deleteAegisWebFolder(selectedFolder.value.id); refresh() }
function toggleMember(videoId) { if (selectedFolder.value) library.value = toggleAegisWebFolderMembership(selectedFolder.value.id, videoId); refresh() }
function downloadBackup(format) {
  triggerAegisWebLibraryDownload(format)
}
</script>

<style scoped>
.aegisWebLibrary { color: #eaf0fa; margin: 0 auto; max-width: 1320px; padding: 28px; }.libraryHeader { align-items: flex-start; border-bottom: 1px solid rgb(151 169 203 / 20%); display: flex; gap: 24px; justify-content: space-between; padding-bottom: 20px; }.eyebrow { color: #8ea4c9; font-size: .75rem; font-weight: 700; letter-spacing: .14em; margin: 0 0 6px; text-transform: uppercase; }h1 { font-size: clamp(1.6rem, 3vw, 2.4rem); margin: 0; }.libraryHeader p:not(.eyebrow) { color: #afbdd3; margin: 8px 0 0; max-width: 660px; }.headerActions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }.headerActions button, .cardFooter button, .folderComposer button, .renameRow button, .dangerButton { background: transparent; border: 1px solid rgb(232 179 60 / 55%); border-radius: 8px; color: #f4c95d; cursor: pointer; font: inherit; padding: 9px 12px; }.headerActions button:hover, button:focus-visible, .folderList button.selected { background: rgb(232 179 60 / 16%); border-color: #f4c95d; }.dangerButton { border-color: rgb(255 115 115 / 55%); color: #ff9a9a; }.emptyState { align-items: center; border: 1px dashed rgb(151 169 203 / 28%); border-radius: 16px; color: #b7c5dc; display: flex; flex-direction: column; margin-top: 28px; padding: 56px 20px; text-align: center; }.emptyState svg { color: #f4c95d; font-size: 2.5rem; }.emptyState h2 { color: #edf3ff; margin-bottom: 0; }.emptyState a, .manageFoldersLink { color: #f4c95d; margin-top: 8px; }.libraryGrid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); list-style: none; margin: 28px 0 0; padding: 0; }.libraryCard { background: #101722; border: 1px solid rgb(151 169 203 / 16%); border-radius: 12px; overflow: hidden; }.cardLink { color: inherit; display: block; text-decoration: none; }.cardLink img { aspect-ratio: 16 / 9; background: #05070b; display: block; object-fit: cover; width: 100%; }.cardBody { display: grid; gap: 5px; padding: 12px; }.cardBody strong { line-height: 1.35; }.cardBody small, .cardFooter time { color: #9daec8; }.cardFooter { align-items: center; border-top: 1px solid rgb(151 169 203 / 12%); display: flex; gap: 10px; justify-content: space-between; padding: 10px 12px; }.cardFooter time { font-size: .72rem; }.cardFooter button { border-color: transparent; font-size: .78rem; padding: 4px 0; }.manageFoldersLink { display: inline-block; font-weight: 700; }.folderComposer { background: #101722; border: 1px solid rgb(151 169 203 / 18%); border-radius: 13px; margin-top: 24px; padding: 18px; }.folderComposer label, .renameRow label { display: block; font-size: .8rem; font-weight: 700; margin-bottom: 7px; }.folderComposer div, .renameRow { display: flex; gap: 8px; }.folderComposer input, .renameRow input { background: #070b11; border: 1px solid rgb(151 169 203 / 35%); border-radius: 8px; color: #eff4ff; flex: 1; font: inherit; min-width: 0; padding: 9px 10px; }.folderComposer p, .folderHelp { color: #9daec8; font-size: .78rem; margin: 10px 0 0; }.folderWorkspace { display: grid; gap: 22px; grid-template-columns: minmax(210px, 280px) 1fr; margin-top: 24px; }.folderList { display: grid; gap: 7px; list-style: none; margin: 0; padding: 0; }.folderList button { background: #0d131e; border: 1px solid rgb(151 169 203 / 18%); border-radius: 8px; color: #eaf0fa; cursor: pointer; display: flex; gap: 8px; padding: 10px; text-align: left; width: 100%; }.folderList svg { color: #f4c95d; }.folderList small { color: #9daec8; margin-left: auto; }.folderDetails { background: #101722; border: 1px solid rgb(151 169 203 / 18%); border-radius: 13px; padding: 20px; }.folderTitleRow { align-items: center; display: flex; gap: 14px; justify-content: space-between; }.folderTitleRow h2 { margin: 0; }.renameRow { margin-top: 15px; }.renameRow label { align-self: center; margin: 0; }.membershipList { display: grid; gap: 9px; list-style: none; margin: 18px 0 0; padding: 0; }.membershipList label { align-items: center; background: #0a0f17; border: 1px solid rgb(151 169 203 / 16%); border-radius: 9px; cursor: pointer; display: flex; gap: 10px; padding: 8px; }.membershipList input { accent-color: #f4c95d; }.membershipList img { aspect-ratio: 16 / 9; object-fit: cover; width: 92px; }.membershipList span { display: grid; gap: 3px; min-width: 0; }.membershipList strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.membershipList small { color: #9daec8; }.emptyFolderMessage { color: #9daec8; }
@media (width <= 680px) { .aegisWebLibrary { padding: 18px 14px; }.libraryHeader, .folderWorkspace { flex-direction: column; grid-template-columns: 1fr; }.headerActions { justify-content: flex-start; }.headerActions button { flex: 1; }.folderTitleRow { align-items: flex-start; flex-direction: column; }.folderComposer div, .renameRow { flex-wrap: wrap; }.folderComposer input, .renameRow input { flex-basis: 100%; }.folderComposer button, .renameRow button { flex: 1; } }
</style>
