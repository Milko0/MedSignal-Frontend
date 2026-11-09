import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/composition/container'

export const useSignalStore = defineStore('signal', () => {
  const signals = ref([])
  const statistics = ref(null)
  const filters = ref({ quarter: '2026Q3', drug: null, reaction: null, min_reports: 20 })
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      signals.value = (await services.signal.list(filters.value)).items
      statistics.value = await services.signal.statistics({ quarter: filters.value.quarter })
    } finally { loading.value = false }
  }
  return { signals, statistics, filters, loading, load }
})
