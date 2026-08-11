<template>
  <nav
    class="settingsMenu"
    :class="{ aegisMenu: isAegisTube }"
    :aria-label="$t('Settings.Settings')"
  >
    <h2 class="header">
      <FontAwesomeIcon
        :icon="['fas', 'sliders-h']"
        class="headingIcon"
      />
      {{ $t('Settings.Settings') }}
    </h2>
    <ul class="settingsMenuList">
      <li
        v-for="settingsSection in settingsSections"
        :key="settingsSection.type"
        class="settingsMenuItem"
      >
        <button
          ref="linkRefs"
          class="title"
          :class="{ active: activeSection === settingsSection.type }"
          type="button"
          :data-section="settingsSection.type"
          :aria-current="activeSection === settingsSection.type ? 'page' : null"
          @click="goToSettingsSection(settingsSection.type)"
        >
          <span class="titleContent">
            <span class="iconAndTitleText">
              <FontAwesomeIcon
                :icon="settingsSection.icon"
                class="titleIcon"
              />
              <span>{{ settingsSection.title }}</span>
            </span>
            <span class="titleUnderline" />
          </span>
        </button>
      </li>
      <li
        v-if="isAegisTube"
        class="settingsMenuItem aboutMenuItem"
      >
        <RouterLink
          class="title aboutLink"
          to="/about"
        >
          <span class="titleContent">
            <span class="iconAndTitleText">
              <FontAwesomeIcon
                :icon="['fas', 'info-circle']"
                class="titleIcon"
              />
              <span>{{ $t('About.About') }}</span>
            </span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useTemplateRef } from 'vue'

defineProps({
  settingsSections: {
    type: Array,
    required: true
  },
  activeSection: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['navigate-to-section'])
const isAegisTube = process.env.AEGISTUBE_EDITION === true

/**
 * @param {string} sectionType
 */
function goToSettingsSection(sectionType) {
  emit('navigate-to-section', sectionType)
}

const linkRefs = useTemplateRef('linkRefs')

defineExpose({
  /**
   * @param {string} name
   */
  focusLink: (name) => {
    linkRefs.value.find((link) => link.dataset.section === name)?.focus()
  }
})
</script>

<style scoped src="./FtSettingsMenu.css" />
