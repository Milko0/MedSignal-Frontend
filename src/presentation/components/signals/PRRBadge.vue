<script setup>
// PRR with one decimal, coloured by severity (domain/rules/signalSeverity). When the CI lower bound and the chi-square
// are given (the signal table), hovering or focusing the badge shows them with the exact PRR: FR-04 keeps all three,
// but most readers only need the PRR, so the other two stay one step away instead of taking two columns.
import { computed, useId } from 'vue'
import { severityTone } from '@/domain/rules/signalSeverity'

const props = defineProps({
  prr: { type: Number, default: null },
  ciLower: { type: Number, default: null },
  chiSquare: { type: Number, default: null },
})
const id = useId()
const valid = computed(() => Number.isFinite(props.prr))
const hasDetails = computed(() => valid.value && (Number.isFinite(props.ciLower) || Number.isFinite(props.chiSquare)))
const fmt = (n, digits) => (Number.isFinite(n) ? n.toFixed(digits) : '–')
</script>

<template>
  <span class="prr" :tabindex="hasDetails ? 0 : undefined" :aria-describedby="hasDetails ? id : undefined">
    <span class="badge" :class="valid ? severityTone(prr) : 'slate'" :title="valid && !hasDetails ? `PRR ${prr.toFixed(2)}` : undefined">{{ valid ? prr.toFixed(1) : '–' }}</span>
    <span v-if="hasDetails" :id="id" role="tooltip" class="tip">
      <span class="row"><span>PRR</span><span>{{ fmt(prr, 2) }}</span></span>
      <span class="row"><span>95% CI lower bound</span><span>{{ fmt(ciLower, 2) }}</span></span>
      <span class="row"><span>Chi-square</span><span>{{ fmt(chiSquare, 1) }}</span></span>
    </span>
  </span>
</template>

<style scoped>
.prr { position: relative; display: inline-block; border-radius: var(--radius-sm); }
.prr[tabindex] { cursor: help; }
.prr:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
/* Weight follows strength: below 2 plain figure, 2-3 outlined, 3+ filled. Never solid red: a signal is not proof. */
.badge { display: inline-block; min-width: 3rem; text-align: right; padding: .0625rem .4rem; border: 1px solid transparent; border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--fs-sm); font-weight: 400; }
.slate { color: var(--ink-2); }
.amber { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, transparent); font-weight: 500; }
.coral { color: var(--coral); background: var(--coral-soft); border-color: color-mix(in srgb, var(--coral) 30%, transparent); font-weight: 600; }

/* Opens to the left, centred on the row, so it stays inside the table's scroll area even on the last row. */
.tip { position: absolute; right: calc(100% + var(--s-2)); top: 50%; transform: translateY(-50%); z-index: 5; display: grid; gap: 2px; min-width: 14rem; padding: var(--s-2) var(--s-3); background: var(--ink); color: var(--on-accent); border-radius: var(--radius-sm); box-shadow: var(--shadow); font-family: var(--font); font-size: var(--fs-xs); text-align: left; white-space: nowrap; visibility: hidden; opacity: 0; transition: opacity var(--t-fast); pointer-events: none; }
.row { display: flex; justify-content: space-between; gap: var(--s-4); }
.row span:last-child { font-family: var(--font-mono); }
.prr:hover .tip, .prr:focus .tip { visibility: visible; opacity: 1; }
</style>
