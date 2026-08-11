<template>
  <div :class="{ aegisView: isAegisTube }">
    <ft-loader
      v-if="isLoading"
      :fullscreen="true"
    />
    <ft-card
      v-else
      class="card"
    >
      <div class="aegisHomeHeading">
        <h2 class="pageTitle">
          <FontAwesomeIcon
            :icon="['fas', 'users']"
            class="headingIcon"
          />
          {{ isAegisTube ? homeLabel : $t("Most Popular") }}
        </h2>
        <div
          v-if="isAegisTube"
          class="aegisViewButtons"
          :aria-label="videoViewLabel"
        >
          <button
            v-for="view in viewModes"
            :key="view.key"
            type="button"
            class="aegisIconButton"
            :class="{ active: listType === view.key }"
            :aria-label="view.label"
            :title="view.label"
            :aria-pressed="listType === view.key"
            @click="updateListType(view.key)"
          >
            <FontAwesomeIcon :icon="view.icon" />
          </button>
        </div>
      </div>
      <div
        v-if="isAegisTube"
        class="aegisSortChips"
        :aria-label="homeFeedOrderLabel"
      >
        <button
          v-for="mode in sortModes"
          :key="mode.key"
          type="button"
          class="aegisSortChip"
          :class="{ active: sortMode === mode.key }"
          :aria-pressed="sortMode === mode.key"
          @click="sortMode = mode.key"
        >
          {{ mode.label }}
        </button>
      </div>
      <ft-element-list
        :data="displayedResults"
      />
      <div
        v-if="isAegisTube && !loadError && shownResults.length > 0 && displayedResults.length === 0"
        class="aegisEmptyState"
        role="status"
      >
        <FontAwesomeIcon
          :icon="['fas', 'check']"
          class="aegisEmptyIcon"
        />
        <h3>{{ caughtUpTitle }}</h3>
        <p>{{ caughtUpMessage }}</p>
      </div>
      <div
        v-if="loadError && shownResults.length === 0"
        class="aegisEmptyState"
        role="alert"
      >
        <FontAwesomeIcon
          :icon="['fas', 'server']"
          class="aegisEmptyIcon"
        />
        <h3>{{ t('Public video service unavailable') }}</h3>
        <p>
          {{ t('AegisTube unavailable help') }}
        </p>
        <button
          type="button"
          class="aegisRetryButton"
          @click="fetchPopularInfo"
        >
          {{ t('Try again') }}
        </button>
      </div>
    </ft-card>
    <ft-refresh-widget
      :disable-refresh="isLoading"
      :last-refresh-timestamp="lastPopularRefreshTimestamp"
      :title="$t('Most Popular')"
      @click="fetchPopularInfo"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import FtLoader from '../../components/FtLoader/FtLoader.vue'
import FtCard from '../../components/ft-card/ft-card.vue'
import FtElementList from '../../components/FtElementList/FtElementList.vue'
import FtRefreshWidget from '../../components/FtRefreshWidget/FtRefreshWidget.vue'
import store from '../../store/index'

import { getInvidiousPopularFeed } from '../../helpers/api/invidious'
import { copyToClipboard, getRelativeTimeFromDate, showToast } from '../../helpers/utils'
import { useI18n } from 'vue-i18n'
import { KeyboardShortcuts } from '../../../constants'

const { t } = useI18n()
const isAegisTube = process.env.AEGISTUBE_EDITION === true
const homeLabel = 'Home'
const videoViewLabel = 'Video view'
const homeFeedOrderLabel = 'Home feed order'
const caughtUpTitle = 'You are all caught up'
const caughtUpMessage = 'Every video in this feed is already in your local watch history.'

const isLoading = ref(false)
const loadError = ref(false)
const sortMode = ref('foryou')

const sortModes = [
  { key: 'foryou', label: 'For You' },
  { key: 'latest', label: 'Latest' },
  { key: 'trending', label: 'Trending' },
  { key: 'unwatched', label: 'Unwatched' }
]

const viewModes = [
  { key: 'grid', label: 'Grid view', icon: ['fas', 'grip'] },
  { key: 'list', label: 'List view', icon: ['fas', 'list'] }
]

const lastPopularRefreshTimestamp = computed(() => {
  return getRelativeTimeFromDate(store.getters.getLastPopularRefreshTimestamp, true)
})

/** @type {import('vue').ComputedRef<Array | null>} */
const popularCache = computed(() => {
  return store.getters.getPopularCache
})

const shownResults = shallowRef(popularCache.value || [])

const listType = computed(() => store.getters.getListType)
const historyById = computed(() => store.getters.getHistoryCacheById)
const subscribedChannelIds = computed(() => new Set(
  (store.getters.getActiveProfile?.subscriptions ?? []).map(channel => channel.id)
))

const displayedResults = computed(() => {
  const items = [...shownResults.value]

  if (!isAegisTube || sortMode.value === 'trending') {
    return items
  }

  if (sortMode.value === 'latest') {
    return items.sort((left, right) => getPublishedTime(right) - getPublishedTime(left))
  }

  if (sortMode.value === 'unwatched') {
    return items.filter(item => historyById.value[getVideoId(item)] === undefined)
  }

  // "For You" is a local-only ranking. Followed channels and videos not in
  // local history rise first; the public feed order remains the tie-breaker.
  return items
    .map((item, index) => ({ item, index, score: getLocalPreferenceScore(item) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item)
})

function getVideoId(item) {
  return item?.videoId ?? item?.id ?? ''
}

function getChannelId(item) {
  return item?.authorId ?? item?.channelId ?? ''
}

function getPublishedTime(item) {
  const value = item?.published ?? item?.publishedDate ?? 0
  const numberValue = Number(value)
  if (Number.isFinite(numberValue)) return numberValue

  const parsedValue = Date.parse(value)
  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

function getLocalPreferenceScore(item) {
  let score = 0
  if (subscribedChannelIds.value.has(getChannelId(item))) score += 2
  if (historyById.value[getVideoId(item)] === undefined) score += 1
  return score
}

function updateListType(value) {
  store.dispatch('updateListType', value)
}

onMounted(() => {
  document.addEventListener('keydown', keyboardShortcutHandler)

  if (shownResults.value.length === 0) {
    fetchPopularInfo()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', keyboardShortcutHandler)
})

async function fetchPopularInfo() {
  isLoading.value = true
  loadError.value = false

  try {
    const items = await getInvidiousPopularFeed()

    store.commit('setLastPopularRefreshTimestamp', new Date())
    shownResults.value = items
    isLoading.value = false
    store.commit('setPopularCache', items)
  } catch (err) {
    isLoading.value = false
    loadError.value = true
    const errorMessage = t('Invidious API Error (Click to copy)')
    showToast(`${errorMessage}: ${err}`, 10000, () => {
      copyToClipboard(err)
    })
  }
}

/**
 * @param {KeyboardEvent} event the keyboard event
 */
function keyboardShortcutHandler(event) {
  if (document.activeElement.classList.contains('ft-input')) {
    return
  }
  // Avoid handling events due to user holding a key (not released)
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/repeat
  if (event.repeat) { return }

  switch (event.key.toLowerCase()) {
    case 'f5':
    case KeyboardShortcuts.APP.SITUATIONAL.REFRESH:
      if (!isLoading.value) {
        fetchPopularInfo()
      }
      break
  }
}

</script>
<style scoped src="./Popular.css" />
