<script setup>
import { DISCLAIMER } from '@/core/constants/disclaimer'

// `text` is the disclaimer that came with an API response (meta.disclaimer); the constant is the fallback.
defineProps({ text: { type: String, default: DISCLAIMER } })
</script>

<template>
  <p class="disclaimer muted">{{ text }}</p>
</template>

<style scoped>
.disclaimer { font-size: .8rem; margin-top: 1.5rem; }
</style>
