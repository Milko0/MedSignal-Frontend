import { ref } from 'vue'
import { defineStore } from 'pinia'
import { services } from '@/composition/container'

// FR-26: reaction terms left out of signals and label gaps (too vague to mean anything, e.g. "drug ineffective").
// The list is short and not paginated. add / remove rethrow so the view can show the message; a list that fails to load
// sets `error`. Answers of an overtaken request are dropped.
export const useAdminTermsStore = defineStore('adminTerms', () => {
  const items = ref([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref('')
  let seq = 0

  async function load() {
    const mine = ++seq
    loading.value = true
    error.value = ''
    try {
      const terms = await services.admin.terms.list()
      if (mine !== seq) return
      items.value = terms
      loaded.value = true
    } catch (e) {
      if (mine !== seq) return
      error.value = e?.message || 'Could not load the excluded terms.'
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  // Resolves to the term as the server stored it (normalised: trimmed, lower case).
  async function add(term) {
    const stored = await services.admin.terms.add(term)
    await load()
    return stored
  }

  async function remove(term) {
    await services.admin.terms.remove(term)
    await load()
  }

  function reset() {
    seq++
    items.value = []
    loading.value = false
    loaded.value = false
    error.value = ''
  }

  return { items, loading, loaded, error, load, add, remove, reset }
})
