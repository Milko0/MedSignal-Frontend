import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import { useUiStore } from '@/application/stores/useUiStore'
import { isInShortage } from '@/domain/rules/shortageStatus'
import { pivotTrend } from '@/domain/rules/pivotTrend'

const MIN_QUERY_LENGTH = 2   // the backend answers 422 below this
const SEARCH_LIMIT = 10
const TREND_MONTHS = 12

export const useDrugStore = defineStore('drug', () => {
  // ---- search (FR-01) ------------------------------------------------------------------------------------------
  const searchQuery = ref('')       // the (trimmed) query `results` belong to
  const results = ref([])
  const searching = ref(false)
  const searchError = ref(null)
  let searchCounter = 0             // only the response of the latest search is applied

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

  // ---- Drug 360 (FR-02, FR-03, FR-10, FR-15) --------------------------------------------------------------------
  const current = ref(null)            // Drug360
  const trend = ref(null)              // flat TrendPoint[]; null = not loaded
  const alternatives = ref(null)       // Alternatives; null = not in shortage or not loaded
  const selection = ref({ dosageForm: null, route: null })
  const dosageForms = ref([])          // forms with a shortage record, from the unfiltered load (feeds the selector)

  const loading = ref(false)           // the overview of a newly opened drug
  const error = ref(null)              // overview failed (not 404)
  const notFound = ref(false)          // overview answered 404
  const refreshing = ref(false)        // overview + alternatives are re-read after the selection changed
  const selectionError = ref(null)
  const trendLoading = ref(false)
  const trendError = ref(null)
  const alternativesLoading = ref(false)
  const alternativesError = ref(null)
  const followPending = ref(false)
  const followError = ref(null)

  // Two tickets: opening another drug invalidates everything in flight; changing the selection only the overview and
  // alternatives (the trend is not filtered by form).
  let drugTicket = 0
  let selectionTicket = 0

  const trendSeries = computed(() => pivotTrend(trend.value))
  const options = () => ({ dosageForm: selection.value.dosageForm, route: selection.value.route })

  async function fetchTrend(rxcui, ticket) {
    trendLoading.value = true
    trendError.value = null
    try {
      const points = await services.drug.getReactionTrend(rxcui, TREND_MONTHS)
      if (ticket === drugTicket) trend.value = points
    } catch (e) {
      if (ticket === drugTicket) { trend.value = null; trendError.value = e }
    } finally {
      if (ticket === drugTicket) trendLoading.value = false
    }
  }

  // Alternatives only mean something while the drug is in shortage (FR-10): otherwise no request is made.
  async function fetchAlternatives(rxcui, drug, ticket) {
    alternativesError.value = null
    if (!isInShortage(current.value?.shortage.status)) {
      alternatives.value = null
      alternativesLoading.value = false
      return
    }
    alternativesLoading.value = true
    try {
      const found = await services.drug.getAlternatives(rxcui, options())
      if (ticket === selectionTicket && drug === drugTicket) alternatives.value = found
    } catch (e) {
      if (ticket === selectionTicket && drug === drugTicket) { alternatives.value = null; alternativesError.value = e }
    } finally {
      if (ticket === selectionTicket && drug === drugTicket) alternativesLoading.value = false
    }
  }

  // Opens a drug. The overview is awaited (the page needs it); the trend and the alternatives then load side by
  // side and fail on their own. Whatever belonged to the previous drug is cleared first.
  async function loadDrug(rxcui, initial = {}) {
    const drug = ++drugTicket
    const ticket = ++selectionTicket
    current.value = null
    trend.value = null
    alternatives.value = null
    dosageForms.value = []
    selection.value = { dosageForm: initial.dosageForm ?? null, route: initial.route ?? null }
    error.value = null
    notFound.value = false
    selectionError.value = null
    trendError.value = null
    alternativesError.value = null
    followError.value = null
    refreshing.value = false
    trendLoading.value = false
    alternativesLoading.value = false
    loading.value = true

    try {
      const overview = await services.drug.getDrug360(rxcui, options())
      if (drug !== drugTicket) return
      current.value = overview
      dosageForms.value = overview.shortage.dosageForms
    } catch (e) {
      if (drug !== drugTicket) return
      if (e?.status === 404) notFound.value = true
      else error.value = e
      return
    } finally {
      if (drug === drugTicket) loading.value = false
    }

    await Promise.allSettled([fetchTrend(rxcui, drug), fetchAlternatives(rxcui, drug, ticket)])
  }

  // FR-02: narrow the shortage view to a dosage form (and route). The overview and the alternatives are read again;
  // the page stays on screen meanwhile. On failure the previous selection and data stay.
  async function setSelection(next = {}) {
    if (!current.value) return
    const rxcui = current.value.rxcui
    const drug = drugTicket
    const previous = selection.value
    selection.value = { dosageForm: next.dosageForm ?? null, route: next.route ?? null }
    const ticket = ++selectionTicket
    refreshing.value = true
    selectionError.value = null
    try {
      const overview = await services.drug.getDrug360(rxcui, options())
      if (ticket !== selectionTicket || drug !== drugTicket) return
      current.value = overview
    } catch (e) {
      if (ticket !== selectionTicket || drug !== drugTicket) return
      selection.value = previous
      selectionError.value = e
      refreshing.value = false
      return
    }
    await fetchAlternatives(rxcui, drug, ticket)
    if (ticket === selectionTicket && drug === drugTicket) refreshing.value = false
  }

  // Retry buttons of the sections that failed on their own.
  const retryTrend = () => (current.value ? fetchTrend(current.value.rxcui, drugTicket) : undefined)
  const retryAlternatives = () => (current.value ? fetchAlternatives(current.value.rxcui, drugTicket, selectionTicket) : undefined)

  // FR-15: follow / unfollow. The button flips at once; if the server refuses, it flips back and the user is told.
  async function toggleFollow() {
    const drug = current.value
    if (!drug || followPending.value || !useAuthStore().loggedIn) return
    const follow = !drug.isFollowed
    drug.isFollowed = follow
    followPending.value = true
    followError.value = null
    try {
      const cabinet = useCabinetStore()
      await (follow ? cabinet.follow(drug.rxcui) : cabinet.unfollow(drug.rxcui))
    } catch (e) {
      if (current.value?.rxcui === drug.rxcui) current.value.isFollowed = !follow
      followError.value = e
      useUiStore().notify(`Could not ${follow ? 'follow' : 'unfollow'} ${drug.name}. Try again.`, 'coral')
    } finally {
      followPending.value = false
    }
  }

  return {
    searchQuery, results, searching, searchError, search,
    current, trend, trendSeries, alternatives, selection, dosageForms,
    loading, error, notFound, refreshing, selectionError, trendLoading, trendError, alternativesLoading,
    alternativesError, followPending, followError,
    loadDrug, setSelection, retryTrend, retryAlternatives, toggleFollow,
  }
})
