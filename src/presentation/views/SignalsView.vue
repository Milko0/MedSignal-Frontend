<script setup>
// View 4 - Signals and statistics (FR-04 to FR-09). Charts below use SAMPLE data to show the Plotly look;
// replace with useSignalStore().statistics once the API is implemented.
import AgeBarChart from '@/presentation/components/charts/AgeBarChart.vue'
import DonutChart from '@/presentation/components/charts/DonutChart.vue'
import TrendChart from '@/presentation/components/charts/TrendChart.vue'

const age = { '0-17': 8000, '18-44': 21000, '45-64': 30000, '65-74': 23500, '75+': 18500 }
const sex = { Female: 58, Male: 39, Unknown: 3 }
const quarters = ['Q2 25', 'Q3 25', 'Q4 25', 'Q1 26', 'Q2 26', 'Q3 26']
const serious = [
  { reaction: 'All reports', months: quarters, counts: [100, 108, 112, 114, 116, 118] },
  { reaction: 'Serious', months: quarters, counts: [32, 35, 38, 40, 42, 44] },
]
</script>

<template>
  <h1>Signals and statistics</h1>
  <p class="muted">Drug and reaction pairs reported more often than expected. TODO: FilterBar and SignalTable.</p>
  <div class="grid two">
    <section class="card"><h3>Reports by age group (sample)</h3><AgeBarChart :groups="age" /></section>
    <section class="card"><h3>Reports by sex (sample)</h3><DonutChart :values="sex" /></section>
    <section class="card"><h3>Serious reports over time (sample)</h3><TrendChart :series="serious" /></section>
  </div>
</template>
