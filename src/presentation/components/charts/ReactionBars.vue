<script setup>
// Most reported reactions as horizontal bars (FR-02). Longest bar on top; long reaction names are cut for the axis
// and shown in full on hover.
import { computed } from 'vue'
import PlotlyChart from './PlotlyChart.vue'
import { COLORS } from './plotlyTheme'

const MAX_LABEL = 28

const props = defineProps({ reactions: { type: Array, default: () => [] } })   // [{ reaction, reports }]

const short = (text) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text)
// Plotly draws the first category at the bottom, so reverse to get the biggest on top.
const rows = computed(() => [...props.reactions].reverse())
const data = computed(() => [{
  type: 'bar',
  orientation: 'h',
  y: rows.value.map((r) => short(r.reaction)),
  x: rows.value.map((r) => r.reports),
  text: rows.value.map((r) => r.reaction),
  marker: { color: COLORS.teal },
  hovertemplate: '%{text}: %{x} reports<extra></extra>',
}])
const layout = {
  margin: { t: 8, r: 12, b: 28, l: 8 },
  yaxis: { automargin: true, gridcolor: 'rgba(0,0,0,0)', zeroline: false },
  xaxis: { gridcolor: COLORS.grid, zeroline: false },
}
</script>

<template><PlotlyChart :data="data" :layout="layout" /></template>
