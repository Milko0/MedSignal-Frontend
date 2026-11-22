<script setup>
import { DISCLAIMER } from '@/core/constants/disclaimer'

// `text` is the disclaimer that came with an API response (meta.disclaimer); the constant is the fallback.
defineProps({ text: { type: String, default: DISCLAIMER } })
</script>

<template>
  <p class="disclaimer muted">{{ text }}</p>
</template>

<style scoped>
/* NFR-11: the disclaimer is body-readable on every signal screen; never smaller or fainter than secondary text. */
.disclaimer { font-size: var(--fs-md); line-height: 1.55; color: var(--ink-2); max-width: 70ch; margin: var(--s-6) 0 0; padding-top: var(--s-3); border-top: 1px solid var(--line-strong); }
</style>
