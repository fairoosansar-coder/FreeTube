<template>
  <div
    :class="{
      grid: grid,
      list: !grid,
      aegisGrid: isAegisTube
    }"
  >
    <slot />
  </div>
</template>

<script setup>
const isAegisTube = process.env.AEGISTUBE_EDITION === true

defineProps({
  grid: {
    type: Boolean,
    required: true
  }
})
</script>

<style scoped src="./FtAutoGrid.css" />
