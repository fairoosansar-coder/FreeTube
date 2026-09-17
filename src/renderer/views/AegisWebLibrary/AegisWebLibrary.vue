<template>
  <section class="aegisWebLibrary" aria-labelledby="aegis-web-library-heading">
    <header class="libraryHeader">
      <div>
        <p class="eyebrow">AegisTube web</p>
        <h1 id="aegis-web-library-heading">{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <button v-if="items.length > 0" type="button" class="clearButton" @click="clearItems">Clear {{ title.toLowerCase() }}</button>
    </header>
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
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRoute } from 'vue-router'
import {
  clearAegisWebLibraryCollection,
  readAegisWebLibrary,
  recordAegisWebHistory,
  removeAegisWebLibraryEntry,
} from '../../helpers/aegisWebLibrary.js'

const route = useRoute()
const library = ref(readAegisWebLibrary())
const collection = computed(() => route.params.collection === 'favorites' ? 'favorites' : 'history')
const title = computed(() => collection.value === 'favorites' ? 'Favorites' : 'Watch history')
const subtitle = computed(() => collection.value === 'favorites'
  ? 'Saved on this browser. No account, video bytes, stream URL, or credentials are stored.'
  : 'Saved on this browser from AegisTube web visits. Remove individual entries or clear the list anytime.')
const items = computed(() => library.value[collection.value])

watch(collection, () => { library.value = readAegisWebLibrary() })

function recordVisit(item) { library.value = recordAegisWebHistory(item) }
function removeItem(videoId) { library.value = removeAegisWebLibraryEntry(collection.value, videoId) }
function clearItems() { library.value = clearAegisWebLibraryCollection(collection.value) }
function activityTime(item) { return collection.value === 'favorites' ? item.savedAt : item.watchedAt }
function displayTime(item) { return new Date(activityTime(item)).toLocaleString() }
</script>

<style scoped>
.aegisWebLibrary { color: #eaf0fa; margin: 0 auto; max-width: 1320px; padding: 28px; }
.libraryHeader { align-items: flex-start; border-bottom: 1px solid rgb(151 169 203 / 20%); display: flex; gap: 24px; justify-content: space-between; padding-bottom: 20px; }
.eyebrow { color: #8ea4c9; font-size: .75rem; font-weight: 700; letter-spacing: .14em; margin: 0 0 6px; text-transform: uppercase; }
h1 { font-size: clamp(1.6rem, 3vw, 2.4rem); margin: 0; }
.libraryHeader p:not(.eyebrow) { color: #afbdd3; margin: 8px 0 0; max-width: 660px; }
.clearButton, .cardFooter button { background: transparent; border: 1px solid rgb(232 179 60 / 55%); border-radius: 8px; color: #f4c95d; cursor: pointer; font: inherit; padding: 9px 12px; }
.emptyState { align-items: center; border: 1px dashed rgb(151 169 203 / 28%); border-radius: 16px; color: #b7c5dc; display: flex; flex-direction: column; margin-top: 28px; padding: 56px 20px; text-align: center; }
.emptyState svg { color: #f4c95d; font-size: 2.5rem; }.emptyState h2 { color: #edf3ff; margin-bottom: 0; }.emptyState a { color: #f4c95d; margin-top: 8px; }
.libraryGrid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); list-style: none; margin: 28px 0 0; padding: 0; }
.libraryCard { background: #101722; border: 1px solid rgb(151 169 203 / 16%); border-radius: 12px; overflow: hidden; }.cardLink { color: inherit; display: block; text-decoration: none; }.cardLink img { aspect-ratio: 16 / 9; background: #05070b; display: block; object-fit: cover; width: 100%; }.cardBody { display: grid; gap: 5px; padding: 12px; }.cardBody strong { line-height: 1.35; }.cardBody small, .cardFooter time { color: #9daec8; }.cardFooter { align-items: center; border-top: 1px solid rgb(151 169 203 / 12%); display: flex; gap: 10px; justify-content: space-between; padding: 10px 12px; }.cardFooter time { font-size: .72rem; }.cardFooter button { border-color: transparent; font-size: .78rem; padding: 4px 0; }
@media (width <= 680px) { .aegisWebLibrary { padding: 18px 14px; }.libraryHeader { flex-direction: column; gap: 14px; }.clearButton { width: 100%; } }
</style>
