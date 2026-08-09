<template>
  <span
    class="aegisTubeBrand"
    :class="{ hero }"
    role="img"
    :aria-label="brandLabel"
  >
    <svg
      class="brandMark"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <circle
        cx="32"
        cy="32"
        r="28"
        class="orbit"
      />
      <circle
        cx="32"
        cy="32"
        r="4"
        class="core"
      />
      <path
        d="M32 10 13 51l11-6 8-18 8 18 11 6Z"
        class="aMark"
      />
      <circle
        cx="32"
        cy="4"
        r="3"
        class="node goldNode"
      />
      <circle
        cx="5"
        cy="39"
        r="3"
        class="node"
      />
      <circle
        cx="59"
        cy="39"
        r="3"
        class="node"
      />
    </svg>
    <span class="brandCopy">
      <span class="wordmark"><strong>{{ brandPrefix }}</strong><strong class="tube">{{ brandSuffix }}</strong></span>
      <span
        v-if="showAttribution"
        class="attribution"
      >{{ attributionLabel }}</span>
    </span>
  </span>
</template>

<script setup>
const brandLabel = 'AegisTube, powered by FreeTube'
const brandPrefix = 'Aegis'
const brandSuffix = 'Tube'
const attributionLabel = 'Powered by FreeTube'

defineProps({
  hero: {
    type: Boolean,
    default: false,
  },
  showAttribution: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped src="./AegisTubeBrand.css" />
