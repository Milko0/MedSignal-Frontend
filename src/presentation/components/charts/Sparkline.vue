<script setup>
// Tiny inline SVG line for a trend of PRR values (one per quarter). Plain SVG on purpose: a table of Plotly charts
// would be heavy. Used by the dashboard and the signal table (FR-04, FR-06).
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 24 },
})

const PAD = 3   // keeps the stroke and the end dot inside the box

const points = computed(() => {
  const values = (props.values ?? []).filter((v) => Number.isFinite(v))
  if (!values.length) return []
  const min = Math.min(...values)
  const range = Math.max(...values) - min
  const innerW = props.width - 2 * PAD
  const innerH = props.height - 2 * PAD
  return values.map((v, i) => ({
    x: values.length === 1 ? props.width / 2 : PAD + (i / (values.length - 1)) * innerW,
    y: range === 0 ? props.height / 2 : PAD + (1 - (v - min) / range) * innerH,
    value: v,
  }))
})

const round = (n) => Math.round(n * 100) / 100
// One point has no line to draw; "M x y h0" with a round cap renders as a dot.
const path = computed(() => {
  const pts = points.value
  if (pts.length === 1) return `M${round(pts[0].x)} ${round(pts[0].y)}h0`
  return pts.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join(' ')
})
const last = computed(() => points.value.at(-1))
const label = computed(() => `Trend: ${points.value.map((p) => p.value).join(', ')}`)
</script>

<template>
  <svg v-if="points.length" class="sparkline" :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" role="img" :aria-label="label">
    <path :d="path" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle :cx="last.x" :cy="last.y" r="2.2" fill="currentColor" />
  </svg>
</template>

<style scoped>
.sparkline { color: var(--ink-2); vertical-align: middle; overflow: visible; }
</style>
