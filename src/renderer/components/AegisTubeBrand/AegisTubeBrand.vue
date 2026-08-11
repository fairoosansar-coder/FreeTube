<template>
  <span
    class="aegisTubeBrand"
    :class="{ hero }"
    role="img"
    :aria-label="brandLabel"
  >
    <AegisTubeMark
      class="brandMark"
    />
    <span class="brandCopy">
      <span class="wordmark"><span class="aegis">{{ brandPrefix }}</span><span class="tube">{{ brandSuffix }}</span></span>
    </span>
  </span>
</template>

<script setup>
import AegisTubeMark from '../AegisTubeShell/AegisTubeMark.vue'

const brandLabel = 'AegisTube'

const props = defineProps({
  hero: {
    type: Boolean,
    default: false,
  },
})

const { hero } = props
const brandPrefix = hero ? 'Aegis' : 'AEGIS'
const brandSuffix = hero ? 'Tube' : 'TUBE'
</script>

<style scoped src="./AegisTubeBrand.css" />
