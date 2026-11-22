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
/* Weight follows strength: below 2 plain figure, 2-3 outlined, 3+ filled. Never solid red: a signal is not proof. */
.badge { display: inline-block; min-width: 3rem; text-align: right; padding: .0625rem .4rem; border: 1px solid transparent; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--fs-sm); font-weight: 400; }
.slate { color: var(--ink-2); }
.amber { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, transparent); font-weight: 500; }
.coral { color: var(--coral); background: var(--coral-soft); border-color: color-mix(in srgb, var(--coral) 30%, transparent); font-weight: 600; }
</style>
