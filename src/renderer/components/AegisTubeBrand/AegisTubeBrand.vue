<template>
  <span
    class="aegisTubeBrand"
    :class="{ hero }"
    role="img"
    :aria-label="showAttribution ? 'AegisTube, powered by FreeTube' : 'AegisTube'"
  >
    <img
      class="brandMark"
      :src="aegisTubeMark"
      alt=""
      aria-hidden="true"
    >
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
import aegisTubeMark from '../../assets/img/aegistube-mark.svg'

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
