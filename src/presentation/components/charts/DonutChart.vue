<script setup>
import { computed } from 'vue'
import PlotlyChart from './PlotlyChart.vue'
import { COLORS } from './plotlyTheme'

const props = defineProps({ values: { type: Object, default: () => ({}) } }) // {Female: 58, Male: 39, Unknown: 3}
const data = computed(() => [{
  type: 'pie', hole: 0.62, labels: Object.keys(props.values), values: Object.values(props.values),
  marker: { colors: [COLORS.teal, COLORS.slate, '#d5dde0'] }, textinfo: 'percent', sort: false,
  hovertemplate: '%{label}: %{value}<extra></extra>',
}])
</script>

<template><PlotlyChart :data="data" :layout="{ margin: { t: 8, r: 8, b: 8, l: 8 } }" /></template>
