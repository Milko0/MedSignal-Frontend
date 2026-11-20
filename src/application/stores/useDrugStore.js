import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/composition/container'
import { isInShortage } from '@/domain/rules/shortageStatus'

export const useDrugStore = defineStore('drug', () => {
  const results = ref([])
  const current = ref(null)
  const alternatives = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function search(query) { results.value = await services.drug.search(query) }
  async function fetchDrug360(rxcui) {
    loading.value = true; error.value = null
    try {
      current.value = await services.drug.getDrug360(rxcui)
      alternatives.value = isInShortage(current.value.shortage.status) ? await services.drug.getAlternatives(rxcui) : null
    } catch (e) { error.value = e } finally { loading.value = false }
  }
  return { results, current, alternatives, loading, error, search, fetchDrug360 }
})
