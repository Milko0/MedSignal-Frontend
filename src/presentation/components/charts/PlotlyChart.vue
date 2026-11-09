<script setup>
// Generic Plotly wrapper: lazy-loads plotly.js, re-renders reactively, resizes with its container.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { baseConfig, baseLayout } from './plotlyTheme'

const props = defineProps({
  data: { type: Array, required: true },
  layout: { type: Object, default: () => ({}) },
  height: { type: String, default: '260px' },
})
const el = ref(null)
let Plotly = null
let observer = null

const merged = () => ({ ...baseLayout(), ...props.layout })

async function draw() {
  if (!el.value) return
  if (!Plotly) Plotly = (await import('plotly.js-dist-min')).default
  Plotly.react(el.value, props.data, merged(), baseConfig)
}

onMounted(async () => {
  await draw()
  observer = new ResizeObserver(() => Plotly && el.value && Plotly.Plots.resize(el.value))
  observer.observe(el.value)
})
watch(() => [props.data, props.layout], draw, { deep: true })
onBeforeUnmount(() => { observer?.disconnect(); if (Plotly && el.value) Plotly.purge(el.value) })
</script>

<template>
  <div ref="el" :style="{ height }" role="img" aria-label="Interactive chart"></div>
</template>
