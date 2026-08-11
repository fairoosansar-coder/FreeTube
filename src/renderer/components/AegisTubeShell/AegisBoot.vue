<template>
  <main
    class="aegisBoot"
    :class="{ hasError: errorMessage }"
  >
    <div class="aurora" />
    <section
      class="bootPanel"
      :role="errorMessage ? 'alert' : 'status'"
      aria-live="polite"
    >
      <div class="bootMarkWrap">
        <span class="orbit" />
        <span class="orbit orbitSecondary" />
        <AegisTubeMark
          class="bootMark"
        />
      </div>

      <div class="bootWordmark">
        {{ brandPrefix }}<span>{{ brandSuffix }}</span>
      </div>
      <p class="bootCaption">
        {{ bootCaption }}
      </p>

      <div class="bootLog">
        <div
          v-for="completedStage in completedStages"
          :key="completedStage"
          class="bootLine completed"
        >
          <span aria-hidden="true">{{ completedGlyph }}</span>
          {{ completedStage }}
        </div>
        <div
          v-if="!errorMessage"
          class="bootLine current"
        >
          <span aria-hidden="true">{{ currentGlyph }}</span>
          {{ stage }}
        </div>
        <div
          v-else
          class="bootError"
        >
          <p>{{ errorMessage }}</p>
          <button
            type="button"
            @click="$emit('retry')"
          >
            {{ retryLabel }}
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import AegisTubeMark from './AegisTubeMark.vue'

const brandPrefix = 'AEGIS'
const brandSuffix = 'TUBE'
const bootCaption = 'Private viewing. Local library.'
const completedGlyph = '✓'
const currentGlyph = '›'
const retryLabel = 'Retry startup'

defineProps({
  stage: {
    type: String,
    required: true
  },
  completedStages: {
    type: Array,
    default: () => []
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

defineEmits(['retry'])
</script>

<style scoped src="./AegisBoot.css" />
