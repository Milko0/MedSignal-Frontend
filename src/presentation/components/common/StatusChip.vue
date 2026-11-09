<script setup>
import { computed } from 'vue'
import { STATUS } from '@/core/constants/status'

const props = defineProps({ status: { type: String, required: true } })
const info = computed(() => STATUS[props.status] ?? { label: props.status, tone: 'slate' })
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
