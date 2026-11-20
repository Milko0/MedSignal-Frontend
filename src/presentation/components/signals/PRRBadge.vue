<script setup>
// PRR with one decimal, coloured by severity (domain/rules/signalSeverity). The tooltip has two decimals.
import { computed } from 'vue'
import { severityTone } from '@/domain/rules/signalSeverity'

const props = defineProps({ prr: { type: Number, default: null } })
const valid = computed(() => Number.isFinite(props.prr))
</script>

<template>
  <span class="badge" :class="valid ? severityTone(prr) : 'slate'" :title="valid ? `PRR ${prr.toFixed(2)}` : 'No PRR'">{{ valid ? prr.toFixed(1) : '–' }}</span>
</template>

<style scoped>
.badge { display: inline-block; min-width: 2.6rem; text-align: center; padding: .1rem .5rem; border-radius: 6px; font-weight: 600; font-variant-numeric: tabular-nums; }
.coral { background: var(--coral-soft); color: var(--coral); }
.amber { background: var(--amber-soft); color: var(--amber); }
.slate { background: var(--slate-soft); color: var(--slate); }
</style>
