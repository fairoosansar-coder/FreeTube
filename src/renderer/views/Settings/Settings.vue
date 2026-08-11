<!-- Modified 2026-08-11 for the AegisTube shell settings experience. -->
<template>
  <div
    class="settingsPage"
    :class="{ aegisTubeSettings: isAegisTube }"
  >
    <template v-if="unlocked">
      <div
        v-show="settingsSectionTypeOpenInMobile != null"
        class="mobileReturnBar"
      >
        <button
          class="returnToMenuMobileButton"
          type="button"
          :aria-label="t('Settings.Return to Settings Menu')"
          :title="t('Settings.Return to Settings Menu')"
          @click="returnToSettingsMenu"
        >
          <FontAwesomeIcon
            class="returnToMenuMobileIcon"
            :icon="['fas', 'angle-left']"
          />
        </button>
        <span
          v-if="isAegisTube"
          class="mobileSectionTitle"
        >
          {{ activeSectionTitle }}
        </span>
      </div>
      <FtSettingsMenu
        v-show="isInDesktopView || settingsSectionTypeOpenInMobile == null"
        ref="menuRef"
        :settings-sections="settingsSectionComponents"
        :active-section="activeSection"
        @navigate-to-section="navigateToSection"
      />
      <div
        v-show="isInDesktopView || settingsSectionTypeOpenInMobile != null"
        class="settingsContent"
      >
        <div
          v-if="isAegisTube"
          class="aegisSettingsToolbar"
        >
          <FtButton
            class="keyboardShortcutsButton"
            :label="t('KeyboardShortcutPrompt.Show Keyboard Shortcuts')"
            :icon="['fas', 'keyboard']"
            @click="showKeyboardShortcuts"
          />
          <FtToggleSwitch
            class="settingsToggle"
            :label="t('Settings.Sort Settings Sections (A-Z)')"
            :default-value="settingsSectionSortEnabled"
            compact
            @change="updateSettingsSectionSortEnabled"
          />
        </div>
        <div class="settingsSections">
          <template v-if="isAegisTube">
            <section
              v-for="section in settingsSectionComponents"
              v-show="shouldShowAegisSection(section.type)"
              :key="section.type"
              ref="sectionRefs"
              class="section aegisSettingsPanel"
              :data-section="section.type"
            >
              <component
                :is="component"
                v-for="(component, index) in section.components"
                :key="`${section.type}-${index}`"
              />
            </section>
          </template>
          <template v-else>
            <component
              :is="section.component"
              v-for="section in settingsSectionComponents"
              :key="section.type"
              ref="sectionRefs"
              class="section"
              :class="{ hideOnMobile: settingsSectionTypeOpenInMobile !== section.type }"
              :data-section="section.type"
            />
          </template>
        </div>
      </div>
    </template>
    <PasswordDialog
      v-else
      @unlocked="handleUnlock"
    />
  </div>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import GeneralSettings from '../../components/GeneralSettings/GeneralSettings.vue'
import ThemeSettings from '../../components/ThemeSettings.vue'
import PlayerSettings from '../../components/PlayerSettings/PlayerSettings.vue'
import SubscriptionSettings from '../../components/SubscriptionSettings/SubscriptionSettings.vue'
import PrivacySettings from '../../components/PrivacySettings.vue'
import DataSettings from '../../components/DataSettings/DataSettings.vue'
import DistractionSettings from '../../components/DistractionSettings/DistractionSettings.vue'
import SponsorBlockSettings from '../../components/SponsorBlockSettings.vue'
import ExperimentalSettings from '../../components/ExperimentalSettings/ExperimentalSettings.vue'
import PasswordDialog from '../../components/PasswordDialog/PasswordDialog.vue'
import FtSettingsMenu from '../../components/FtSettingsMenu/FtSettingsMenu.vue'
import FtToggleSwitch from '../../components/FtToggleSwitch/FtToggleSwitch.vue'
import FtButton from '../../components/FtButton/FtButton.vue'

import store from '../../store/index'

const SETTINGS_MOBILE_WIDTH_THRESHOLD = 1015

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()

const isAegisTube = process.env.AEGISTUBE_EDITION === true

const isInDesktopView = ref(true)
const settingsSectionTypeOpenInMobile = ref(null)
const activeSection = ref(null)

/** @type {import('vue').ComputedRef<boolean>} */
const settingsSectionSortEnabled = computed(() => store.getters.getSettingsSectionSortEnabled)

const settingsComponentsData = computed(() => {
  if (isAegisTube) {
    return [
      {
        type: 'theme',
        title: 'Theme',
        icon: ['fas', 'display'],
        component: ThemeSettings,
        components: [ThemeSettings]
      },
      {
        type: 'player',
        title: 'Player & External',
        icon: ['fas', 'circle-play'],
        component: PlayerSettings,
        components: [PlayerSettings]
      },
      {
        type: 'subscription',
        title: 'Subscription',
        icon: ['fas', 'play'],
        component: SubscriptionSettings,
        components: [SubscriptionSettings]
      },
      {
        type: 'distraction',
        title: 'Distraction Free',
        icon: ['fas', 'eye-slash'],
        component: DistractionSettings,
        components: [DistractionSettings]
      },
      {
        type: 'privacy-data',
        title: 'Privacy & Data',
        icon: ['fas', 'lock'],
        component: PrivacySettings,
        components: [PrivacySettings, DataSettings]
      },
      {
        type: 'sponsor-block',
        title: 'SponsorBlock',
        icon: ['fas', 'shield'],
        component: SponsorBlockSettings,
        components: [SponsorBlockSettings]
      },
      {
        type: 'experimental',
        title: 'Experimental',
        icon: ['fas', 'flask'],
        component: ExperimentalSettings,
        components: [ExperimentalSettings]
      }
    ]
  }

  return [
    {
      type: 'theme',
      title: t('Settings.Theme Settings.Theme Settings'),
      icon: ['fas', 'display'],
      component: ThemeSettings,
      components: [ThemeSettings]
    },
    {
      type: 'player',
      title: t('Settings.Player Settings.Player Settings'),
      icon: ['fas', 'circle-play'],
      component: PlayerSettings,
      components: [PlayerSettings]
    },
    {
      type: 'subscription',
      title: t('Settings.Subscription Settings.Subscription Settings'),
      icon: ['fas', 'play'],
      component: SubscriptionSettings,
      components: [SubscriptionSettings]
    },
    {
      type: 'distraction',
      title: t('Settings.Distraction Free Settings.Distraction Free Settings'),
      icon: ['fas', 'eye-slash'],
      component: DistractionSettings,
      components: [DistractionSettings]
    },
    {
      type: 'privacy',
      title: t('Settings.Privacy Settings.Privacy Settings'),
      icon: ['fas', 'lock'],
      component: PrivacySettings,
      components: [PrivacySettings]
    },
    {
      type: 'data',
      title: t('Settings.Data Settings.Data Settings'),
      icon: ['fas', 'database'],
      component: DataSettings,
      components: [DataSettings]
    },
    {
      type: 'sponsor-block',
      title: t('Settings.SponsorBlock Settings.SponsorBlock Settings'),
      // TODO: replace with SponsorBlock icon
      icon: ['fas', 'shield'],
      component: SponsorBlockSettings,
      components: [SponsorBlockSettings]
    }
  ]
})

const collator = computed(() => {
  return new Intl.Collator([locale.value, 'en'], { sensitivity: 'base' })
})

const settingsSectionComponents = computed(() => {
  let settingsSections = settingsComponentsData.value

  if (settingsSectionSortEnabled.value) {
    const collator_ = collator.value

    settingsSections = settingsSections.toSorted((a, b) => {
      return collator_.compare(a.title, b.title)
    })
  }

  // ensure General Settings is placed first regardless of sorting
  const generalSettingsEntry = {
    type: 'general',
    title: isAegisTube ? 'General' : t('Settings.General Settings.General Settings'),
    icon: ['fas', 'border-all'],
    component: GeneralSettings,
    components: [GeneralSettings]
  }

  return [generalSettingsEntry, ...settingsSections]
})

const unlocked = ref(store.getters.getSettingsPassword === '')

const activeSectionTitle = computed(() => {
  return settingsSectionComponents.value.find(section => section.type === activeSection.value)?.title ?? ''
})

if (unlocked.value) {
  onMounted(handleMounted)
}

function handleUnlock() {
  unlocked.value = true

  nextTick(() => {
    handleMounted()
  })
}

onBeforeUnmount(() => {
  document.removeEventListener('scroll', markScrolledToSectionAsActive)
  window.removeEventListener('resize', handleResize)
})

function handleMounted() {
  handleResize()
  window.addEventListener('resize', handleResize)
  if (!isAegisTube) {
    document.addEventListener('scroll', markScrolledToSectionAsActive)
  }

  const requestedSection = getRequestedSection()
  activeSection.value = requestedSection ?? settingsSectionComponents.value[0].type

  if (isAegisTube && !isInDesktopView.value && requestedSection != null) {
    settingsSectionTypeOpenInMobile.value = requestedSection
  }
}

/**
 * @param {boolean} value
 */
function updateSettingsSectionSortEnabled(value) {
  store.dispatch('updateSettingsSectionSortEnabled', value)
}

function showKeyboardShortcuts() {
  store.dispatch('showKeyboardShortcutPrompt')
}

const sectionRefs = useTemplateRef('sectionRefs')

/**
 * @param {string} sectionType
 */
function navigateToSection(sectionType) {
  if (!settingsSectionComponents.value.some(section => section.type === sectionType)) {
    return
  }

  if (isAegisTube) {
    activeSection.value = sectionType

    if (!isInDesktopView.value) {
      settingsSectionTypeOpenInMobile.value = sectionType
    }

    syncSectionQuery(sectionType)
    nextTick(() => focusSectionHeading(sectionType))
    return
  }

  if (isInDesktopView.value) {
    nextTick(() => {
      const sectionElement = findSectionElement(sectionType)

      if (sectionElement == null) {
        return
      }

      sectionElement.scrollIntoView()
      focusSectionHeading(sectionType)
    })
  } else {
    settingsSectionTypeOpenInMobile.value = sectionType
  }
}

const menuRef = useTemplateRef('menuRef')

function returnToSettingsMenu() {
  const openSection = settingsSectionTypeOpenInMobile.value
  settingsSectionTypeOpenInMobile.value = null

  // focus the corresponding Settings Menu title
  nextTick(() => {
    return menuRef.value?.focusLink(openSection)
  })
}

/* Set the current section to be shown as active in the Settings Menu
* if it is the lowest section within the top quarter of the viewport (25vh) */
function markScrolledToSectionAsActive() {
  if (isAegisTube || !isInDesktopView.value) {
    activeSection.value = null
    return
  }

  const scrollY = window.scrollY + window.innerHeight / 4

  for (const sectionRef of sectionRefs.value ?? []) {
    const sectionElement = getSectionElement(sectionRef)

    const sectionHeight = sectionElement.offsetHeight
    const sectionTop = sectionElement.offsetTop

    if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
      activeSection.value = sectionElement.dataset.section
      break
    }
  }
}

function handleResize() {
  const wasNotInDesktopView = !isInDesktopView.value
  isInDesktopView.value = window.innerWidth > SETTINGS_MOBILE_WIDTH_THRESHOLD

  // navigate to section that was open in mobile or desktop view, if any
  if (isInDesktopView.value && wasNotInDesktopView && settingsSectionTypeOpenInMobile.value != null) {
    navigateToSection(settingsSectionTypeOpenInMobile.value)
    settingsSectionTypeOpenInMobile.value = null
  } else if (!isInDesktopView.value && !wasNotInDesktopView && activeSection.value) {
    navigateToSection(activeSection.value)
  }
}

function shouldShowAegisSection(sectionType) {
  if (isInDesktopView.value) {
    return activeSection.value === sectionType
  }

  return settingsSectionTypeOpenInMobile.value === sectionType
}

function getRequestedSection() {
  if (!isAegisTube || typeof route.query.section !== 'string') {
    return null
  }

  return settingsSectionComponents.value.some(section => section.type === route.query.section)
    ? route.query.section
    : null
}

function syncSectionQuery(sectionType) {
  if (!isAegisTube || route.query.section === sectionType) {
    return
  }

  router.replace({
    query: {
      ...route.query,
      section: sectionType
    }
  })
}

function getSectionElement(sectionRef) {
  return sectionRef?.$el ?? sectionRef ?? null
}

function findSectionElement(sectionType) {
  for (const sectionRef of sectionRefs.value ?? []) {
    const sectionElement = getSectionElement(sectionRef)

    if (sectionElement?.dataset.section === sectionType) {
      return sectionElement
    }
  }

  return null
}

function focusSectionHeading(sectionType) {
  const sectionElement = findSectionElement(sectionType)
  const sectionHeading = sectionElement?.querySelector('.sectionTitle, h3, h2')

  if (sectionHeading == null) {
    return
  }

  sectionHeading.tabIndex = -1
  sectionHeading.focus({ preventScroll: isAegisTube })
}

watch(() => route.query.section, () => {
  if (!isAegisTube || !unlocked.value) {
    return
  }

  const requestedSection = getRequestedSection()
  if (requestedSection == null || requestedSection === activeSection.value) {
    return
  }

  activeSection.value = requestedSection
  if (!isInDesktopView.value) {
    settingsSectionTypeOpenInMobile.value = requestedSection
  }
})
</script>

<style scoped src="./Settings.css" />
