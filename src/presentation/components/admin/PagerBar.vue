<script setup>
// Previous / Next for the admin lists. There is no total (the backend answers a bare array), so only the page number.
defineProps({
  page: { type: Number, required: true },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})
defineEmits(['prev', 'next'])
</script>

<template>
  <nav class="pager" aria-label="Pages">
    <button type="button" class="btn outline" :disabled="!hasPrev || loading" @click="$emit('prev')">Previous</button>
    <span class="muted" aria-live="polite">Page {{ page }}</span>
    <button type="button" class="btn outline" :disabled="!hasNext || loading" @click="$emit('next')">Next</button>
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: flex-end; gap: var(--s-3); margin-top: var(--s-3); font-size: var(--fs-md); }
.pager .btn:disabled { opacity: .45; cursor: not-allowed; }
</style>
