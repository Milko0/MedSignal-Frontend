<script setup>
import { computed } from 'vue'
import { STATUS } from '@/core/constants/status'

// `label` and `tone` override the text and colour the status would give (for values the STATUS map does not know,
// or text that comes from a rule such as formatShortage).
const props = defineProps({
  status: { type: String, required: true },
  label: { type: String, default: null },
  tone: { type: String, default: null },
})
const info = computed(() => {
  const known = STATUS[props.status] ?? { label: props.status, tone: 'slate' }
  return { label: props.label ?? known.label, tone: props.tone ?? known.tone }
})
</script>

<template>
  <span class="chip" :class="info.tone">{{ info.label }}</span>
</template>

<style scoped>
.chip { display: inline-block; padding: .15rem .6rem; border-radius: 999px; font-size: .78rem; }
.teal { background: var(--teal-soft); color: var(--teal); }
.amber { background: var(--amber-soft); color: var(--amber); }
.coral { background: var(--coral-soft); color: var(--coral); }
.green { background: var(--green-soft); color: var(--green); }
.slate { background: var(--slate-soft); color: var(--slate); }
</style>
