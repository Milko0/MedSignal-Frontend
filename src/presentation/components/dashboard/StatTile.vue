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
.tile { --tone: var(--slate); display: flex; flex-direction: column; gap: var(--s-1); padding: var(--s-4) var(--s-5); }
.value { font-family: var(--font-mono); font-size: var(--fs-xl); font-weight: 500; line-height: 1.1; letter-spacing: -.02em; color: var(--ink); }
.label { font-size: var(--fs-sm); color: var(--ink-2); }
.label::before { content: ''; display: inline-block; width: .5rem; height: .5rem; border-radius: 50%; background: var(--tone); margin-right: var(--s-2); vertical-align: .05em; }
.teal { --tone: var(--teal); }
.amber { --tone: var(--amber); }
.coral { --tone: var(--coral); }
.green { --tone: var(--green); }
.slate { --tone: var(--slate); }
</style>
