<!-- Modified 2026-08-11 for the AegisTube shell edition. -->
<template>
  <FtFlexBox
    v-if="isAegisTube"
    class="sideNav aegisSideNav"
    :class="{ opened: isOpen, compact: !isOpen }"
    role="navigation"
    :aria-label="navigationLabel"
  >
    <div class="inner">
      <div class="navMain">
        <router-link
          class="navOption"
          role="button"
          to="/popular"
          :title="homeLabel"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'play']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ homeLabel }}</span>
        </router-link>
        <router-link
          class="navOption"
          role="button"
          to="/subscriptions"
          :title="followingLabel"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'rss']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ followingLabel }}</span>
        </router-link>
        <router-link
          class="navOption"
          role="button"
          to="/userplaylists"
          :title="$t('Playlists')"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'bookmark']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ $t('Playlists') }}</span>
        </router-link>
        <router-link
          class="navOption"
          role="button"
          to="/history"
          :title="historyTitle"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'history']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ $t('History.History') }}</span>
        </router-link>
      </div>

      <div class="navUtility">
        <router-link
          class="navOption settingsOption"
          role="button"
          to="/settings"
          :title="settingsTitle"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'sliders-h']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ $t('Settings.Settings') }}</span>
        </router-link>
        <router-link
          class="navOption sourceOption"
          role="button"
          to="/about"
          :title="sourceLabel"
        >
          <span class="thumbnailContainer">
            <FontAwesomeIcon
              :icon="['fas', 'info-circle']"
              class="navIcon"
            />
          </span>
          <span class="navLabel">{{ sourceLabel }}</span>
        </router-link>
      </div>
    </div>
  </FtFlexBox>
  <FtFlexBox
    v-else
    class="sideNav"
    :class="[{ opened: isOpen }, applyHiddenLabels]"
    role="navigation"
  >
    <div
      class="inner"
      :class="applyHiddenLabels"
    >
      <router-link
        class="navOption topNavOption mobileShow"
        role="button"
        to="/popular"
        :title="homeLabel"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'play']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ homeLabel }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/subscriptions"
        :title="$t('Subscriptions.Subscriptions')"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'rss']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ $t('Subscriptions.Subscriptions') }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/userplaylists"
        :title="$t('Playlists')"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'bookmark']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ $t('Playlists') }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileShow"
        role="button"
        to="/history"
        :title="historyTitle"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'history']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ $t('History.History') }}
        </p>
      </router-link>
      <hr>
      <router-link
        class="navOption mobileShow smallMobileOnlyHidden"
        role="button"
        to="/settings"
        :title="settingsTitle"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'sliders-h']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ $t('Settings.Settings') }}
        </p>
      </router-link>
      <router-link
        class="navOption mobileHidden"
        role="button"
        to="/about"
        :title="sourceLabel"
      >
        <div class="thumbnailContainer">
          <FontAwesomeIcon
            :icon="['fas', 'info-circle']"
            class="navIcon"
            :class="applyNavIconExpand"
          />
        </div>
        <p class="navLabel">
          {{ sourceLabel }}
        </p>
      </router-link>
    </div>
  </FtFlexBox>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import FtFlexBox from '../ft-flex-box/ft-flex-box.vue'

import store from '../../store/index'

import { localizeAndAddKeyboardShortcutToActionTitle } from '../../helpers/utils'
import { KeyboardShortcuts } from '../../../constants'

const { t } = useI18n()
const isAegisTube = process.env.AEGISTUBE_EDITION === true
const homeLabel = 'Home'
const followingLabel = 'Following'
const sourceLabel = 'Source & Legal'
const navigationLabel = 'AegisTube'

/** @type {import('vue').ComputedRef<boolean>} */
const isOpen = computed(() => store.getters.getIsSideNavOpen)

const hideText = computed(() => {
  return !isOpen.value && store.getters.getHideLabelsSideBar
})

const applyNavIconExpand = computed(() => {
  return {
    navIconExpand: hideText.value
  }
})

const applyHiddenLabels = computed(() => {
  return {
    hiddenLabels: hideText.value
  }
})

const historyTitle = computed(() => {
  const shortcut = process.platform === 'darwin'
    ? KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_HISTORY_MAC
    : KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_HISTORY

  return localizeAndAddKeyboardShortcutToActionTitle(
    t('History.History'),
    shortcut
  )
})

const settingsTitle = computed(() => {
  return localizeAndAddKeyboardShortcutToActionTitle(
    t('Settings.Settings'),
    KeyboardShortcuts.APP.GENERAL.NAVIGATE_TO_SETTINGS
  )
})
</script>

<style scoped src="./SideNav.normal.css" />
<style scoped src="./SideNav.css" />
