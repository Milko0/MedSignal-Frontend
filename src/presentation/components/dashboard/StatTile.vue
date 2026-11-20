<script setup>
// One summary number on the dashboard. `value` null (not loaded, or the load failed) shows a dash, never a made-up 0.
defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: null },
  tone: { type: String, default: 'teal' },   // teal | amber | coral | green | slate
})
</script>

<template>
  <div class="tile card" :class="tone">
    <span class="value">{{ value ?? '–' }}</span>
    <span class="label muted">{{ label }}</span>
  </div>
</template>

<style scoped>
.tile { display: flex; flex-direction: column; gap: .15rem; padding: .85rem 1rem; border-left-width: 4px; }
.value { font-size: 1.7rem; font-weight: 700; line-height: 1.1; }
.label { font-size: .82rem; }
.teal { border-left-color: var(--teal); }
.amber { border-left-color: var(--amber); }
.coral { border-left-color: var(--coral); }
.green { border-left-color: var(--green); }
.slate { border-left-color: var(--slate); }
</style>
