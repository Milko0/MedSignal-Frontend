import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { defaultFilters, effectiveMinReports, filtersFromQuery } from '@/domain/rules/signalFilters'
import { quartersFromBuckets } from '@/domain/rules/statsShaping'

// Signal explorer (FR-04 to FR-09). The URL is the source of truth for the filters: the view reads route.query into
// the store (`applyQuery`) and writes changes back with router.replace, so links and back/forward just work.
export const useSignalStore = defineStore('signal', () => {
  const filters = ref(defaultFilters())

  // table (all / emerging tabs share the page model, gaps has its own)
  const list = ref(null)              // { items, total, page, pageSize, totalPages } | null
  const labelGaps = ref(null)         // LabelGaps | null (gaps tab)
  const usedQuarter = ref(null)       // the quarter the backend actually used
  const matchCoverage = ref(null)
  const disclaimer = ref(null)        // meta.disclaimer of the last table response
  const tableLoading = ref(false)
  const tableError = ref(null)

  const quarters = ref([])            // newest first
  const quartersError = ref(null)

  // FR-09: the reports behind one signal, in a side panel.
  const emptyDrawer = () => ({
    open: false, rxcui: null, drug: null, reaction: null,
    page: 1, pageSize: 10, items: [], total: 0, totalPages: 0,
    loading: false, error: null,
    unavailable: false,               // the backend answered 404 (backend request B2: a `/` in the reaction cannot be routed)
  })
  const reportsDrawer = ref(emptyDrawer())

  let tableTicket = 0                 // only the answer of the latest request is applied
  let drawerTicket = 0

  // The gaps tab is per drug: without one there is nothing to ask for.
  const needsDrug = computed(() => filters.value.tab === 'gaps' && !filters.value.rxcui)

  // The drug's name for display: the one in the URL, else the one the table rows carry.
  const drugName = computed(() => {
    const f = filters.value
    if (!f.rxcui) return null
    return f.drugName ?? list.value?.items.find((s) => s.rxcui === f.rxcui)?.drug ?? null
  })

  async function loadQuarters() {
    quartersError.value = null
    try {
      quarters.value = quartersFromBuckets((await services.signal.statistics({ groupBy: 'quarter' })).buckets)
    } catch (e) {
      quartersError.value = e
    }
  }

  // One request per tab: all -> GET /signals, emerging -> GET /signals/emerging, gaps -> GET /drugs/{rxcui}/label-gaps.
  async function loadTable() {
    const ticket = ++tableTicket
    const f = filters.value
    tableError.value = null

    if (needsDrug.value) {
      list.value = null
      labelGaps.value = null
      tableLoading.value = false
      return
    }

    tableLoading.value = true
    const minReports = effectiveMinReports(f)
    try {
      if (f.tab === 'gaps') {
        const gaps = await services.drug.getLabelGaps(f.rxcui, minReports)
        if (ticket !== tableTicket) return
        labelGaps.value = gaps
        list.value = null
        disclaimer.value = gaps.disclaimer ?? null
      } else {
        const result = f.tab === 'emerging'
          ? await services.signal.emerging({ quarter: f.quarter, minReports, page: f.page, pageSize: f.pageSize })
          : await services.signal.list({
            quarter: f.quarter, rxcui: f.rxcui, reaction: f.reaction, minReports, onlySignals: f.onlySignals, page: f.page, pageSize: f.pageSize,
          })
        if (ticket !== tableTicket) return
        list.value = { items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages }
        labelGaps.value = null
        usedQuarter.value = result.quarter
        matchCoverage.value = result.matchCoverage
        disclaimer.value = result.disclaimer ?? null
      }
    } catch (e) {
      if (ticket !== tableTicket) return
      list.value = null
      labelGaps.value = null
      tableError.value = e
    } finally {
      if (ticket === tableTicket) tableLoading.value = false
    }
  }

  async function loadReportsPage(page = 1) {
    const d = reportsDrawer.value
    if (!d.open) return
    const ticket = ++drawerTicket
    d.loading = true
    d.error = null
    d.unavailable = false
    try {
      const result = await services.signal.reports(d.rxcui, d.reaction, { page, pageSize: d.pageSize })
      if (ticket !== drawerTicket) return
      Object.assign(d, { items: result.items, total: result.total, page: result.page, totalPages: result.totalPages })
    } catch (e) {
      if (ticket !== drawerTicket) return
      Object.assign(d, { items: [], total: 0, totalPages: 0 })
      if (e?.status === 404) d.unavailable = true
      else d.error = e
    } finally {
      if (ticket === drawerTicket) d.loading = false
    }
  }

  // `row` is a Signal of the table. The reaction is sent URL-encoded by the adapter.
  async function openReports(row) {
    reportsDrawer.value = { ...emptyDrawer(), open: true, rxcui: row.rxcui, drug: row.drug, reaction: row.reaction }
    await loadReportsPage(1)
  }

  function closeReports() {
    drawerTicket++                    // an answer still on its way is dropped
    reportsDrawer.value = emptyDrawer()
  }

  // Called by the view with route.query on enter and whenever the query changes.
  async function applyQuery(query) {
    filters.value = filtersFromQuery(query)
    closeReports()                    // the rows the drawer belonged to are gone
    await loadTable()
  }

  return {
    filters, list, labelGaps, usedQuarter, matchCoverage, disclaimer, tableLoading, tableError, quarters, quartersError,
    needsDrug, drugName, reportsDrawer, loadQuarters, loadTable, applyQuery, openReports, loadReportsPage, closeReports,
  }
})
