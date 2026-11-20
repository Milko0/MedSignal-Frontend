import { defineStore } from 'pinia'
import { ref } from 'vue'
import { services } from '@/composition/container'
import { isInShortage } from '@/domain/rules/shortageStatus'

const MIN_QUERY_LENGTH = 2   // the backend answers 422 below this
const SEARCH_LIMIT = 10

export const useDrugStore = defineStore('drug', () => {
  // search (FR-01)
  const searchQuery = ref('')       // the (trimmed) query `results` belong to
  const results = ref([])
  const searching = ref(false)
  const searchError = ref(null)
  let searchCounter = 0             // only the response of the latest search is applied

  // Drug 360 (FR-02)
  const current = ref(null)
  const alternatives = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // FR-01: a query shorter than 2 characters clears the results without a request. A response that arrives after a
  // newer search (or after the box was cleared) is dropped, so a slow answer for "ibu" never replaces "ibuprofn".
  async function search(query) {
    const text = (query ?? '').trim()
    const ticket = ++searchCounter
    searchQuery.value = text
    searchError.value = null
    if (text.length < MIN_QUERY_LENGTH) {
      results.value = []
      searching.value = false
      return
    }
    searching.value = true
    try {
      const found = await services.drug.search(text, SEARCH_LIMIT)
      if (ticket !== searchCounter) return
      results.value = found
    } catch (e) {
      if (ticket !== searchCounter) return
      results.value = []
      searchError.value = e
    } finally {
      if (ticket === searchCounter) searching.value = false
    }
  }

  async function fetchDrug360(rxcui) {
    loading.value = true; error.value = null
    try {
      current.value = await services.drug.getDrug360(rxcui)
      alternatives.value = isInShortage(current.value.shortage.status) ? await services.drug.getAlternatives(rxcui) : null
    } catch (e) { error.value = e } finally { loading.value = false }
  }

  return { searchQuery, results, searching, searchError, current, alternatives, loading, error, search, fetchDrug360 }
})
