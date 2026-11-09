<script setup>
import { computed } from 'vue'
import PlotlyChart from './PlotlyChart.vue'

const props = defineProps({ series: { type: Array, default: () => [] } }) // [{reaction, months, counts}]
const data = computed(() => props.series.map((s) => ({
  type: 'scatter', mode: 'lines+markers', name: s.reaction, x: s.months, y: s.counts,
  line: { shape: 'spline', width: 2.5 }, hovertemplate: '%{y} reports<extra>' + s.reaction + '</extra>',
})))
</script>

<template><PlotlyChart :data="data" :layout="{ hovermode: 'x unified' }" /></template>
