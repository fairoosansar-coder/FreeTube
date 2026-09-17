<template>
  <aside v-if="entry" class="aegisWebMiniPlayer" aria-label="AegisTube mini player">
    <header>
      <div class="miniMeta">
        <strong>{{ entry.title || `Video ${entry.videoId}` }}</strong>
        <small v-if="entry.author">{{ entry.author }}</small>
      </div>
      <button type="button" title="Restore video page" @click="restore">Restore</button>
      <button type="button" title="Close mini player" @click="close">Close</button>
    </header>
    <iframe
      class="aegisWebMiniPlayerFrame"
      :src="embedUrl"
      :title="entry.title || 'AegisTube mini player'"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      loading="eager"
      referrerpolicy="strict-origin-when-cross-origin"
    />
  </aside>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createAegisWebPlaybackUrl } from '../../helpers/aegisWebPlayback.js'
import { AEGIS_WEB_MINI_PLAYER_EVENT, normalizeAegisWebMiniPlayerEntry } from '../../helpers/aegisWebMiniPlayer.js'

const router = useRouter()
const entry = ref(null)
const embedUrl = computed(() => entry.value === null ? null : createAegisWebPlaybackUrl({
  videoId: entry.value.videoId,
  origin: window.location.origin,
  startSeconds: entry.value.resumeSeconds,
  // This can be true only after the user pressed the originating watch-page
  // mini-player control; normal browser playback remains non-autoplaying.
  autoplay: true,
}))

function open(event) {
  const next = normalizeAegisWebMiniPlayerEntry(event?.detail)
  if (next !== null) entry.value = next
}
function close() { entry.value = null }
function restore() {
  if (entry.value === null) return
  const current = entry.value
  close()
  router.push(`/watch/${current.videoId}${current.resumeSeconds > 0 ? `?timestamp=${current.resumeSeconds}` : ''}`)
}

onMounted(() => window.addEventListener(AEGIS_WEB_MINI_PLAYER_EVENT, open))
onBeforeUnmount(() => window.removeEventListener(AEGIS_WEB_MINI_PLAYER_EVENT, open))
</script>

<style scoped>
.aegisWebMiniPlayer { background: #090d14; border: 1px solid rgb(232 179 60 / 48%); border-radius: 13px; bottom: 18px; box-shadow: 0 18px 52px rgb(0 0 0 / 48%); overflow: hidden; position: fixed; right: 20px; width: min(360px, calc(100vw - 32px)); z-index: 60; }
header { align-items: center; background: linear-gradient(120deg, #111b2a, #15100a); display: flex; gap: 8px; min-height: 48px; padding: 8px 10px; }
.miniMeta { display: grid; flex: 1; min-width: 0; }.miniMeta strong, .miniMeta small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.miniMeta strong { color: #f1f5fd; font-size: .78rem; }.miniMeta small { color: #aebbd0; font-size: .7rem; margin-top: 2px; }
button { background: transparent; border: 1px solid rgb(255 255 255 / 18%); border-radius: 6px; color: #eff4ff; cursor: pointer; font: inherit; font-size: .7rem; padding: 5px 7px; } button:hover, button:focus-visible { border-color: #f4c95d; color: #f4c95d; }
.aegisWebMiniPlayerFrame { aspect-ratio: 16 / 9; border: 0; display: block; width: 100%; }
@media (width <= 680px) { .aegisWebMiniPlayer { bottom: 10px; right: 10px; width: min(340px, calc(100vw - 20px)); } }
</style>
