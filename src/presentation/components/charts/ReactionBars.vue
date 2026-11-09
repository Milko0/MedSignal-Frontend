<script setup>
import { computed } from 'vue'
import PlotlyChart from './PlotlyChart.vue'
import { COLORS } from './plotlyTheme'

const props = defineProps({ reactions: { type: Array, default: () => [] } }) // [{term, count}]
const data = computed(() => [{
  type: 'bar', orientation: 'h',
  y: props.reactions.map((r) => r.term).reverse(), x: props.reactions.map((r) => r.count).reverse(),
  marker: { color: COLORS.teal }, hovertemplate: '%{y}: %{x} reports<extra></extra>',
}])
</script>

<template><PlotlyChart :data="data" :layout="{ margin: { t: 8, r: 12, b: 28, l: 110 } }" /></template>
