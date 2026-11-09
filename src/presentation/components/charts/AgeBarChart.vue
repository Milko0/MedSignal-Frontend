<script setup>
import { computed } from 'vue'
import PlotlyChart from './PlotlyChart.vue'
import { COLORS } from './plotlyTheme'

const props = defineProps({ groups: { type: Object, default: () => ({}) } }) // {'0-17': 8000, ...}
const data = computed(() => [{
  type: 'bar', x: Object.keys(props.groups), y: Object.values(props.groups), marker: { color: COLORS.teal },
  hovertemplate: '%{x}: %{y:,} reports<extra></extra>',
}])
</script>

<template><PlotlyChart :data="data" /></template>
