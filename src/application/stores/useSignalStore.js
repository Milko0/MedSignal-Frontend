import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { defaultFilters, effectiveMinReports, filterApplies, filtersFromQuery } from '@/domain/rules/signalFilters'
import { ageGroups, lastQuarters, quartersFromBuckets, seriousSeries, sexShares } from '@/domain/rules/statsShaping'

const SERIES_QUARTERS = 6   // quarters on the "serious over time" chart

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

  // FR-08: statistics charts. They describe what the table shows (same drug and quarter), each one loads and fails alone.
  const stats = ref({ age: null, sex: null, seriousOverTime: null })    // shaped for the charts; null = not loaded
  const statsLoading = ref({ age: false, sex: false, seriousOverTime: false })
  const statsError = ref({ age: null, sex: null, seriousOverTime: null })
  const statsScope = ref({ rxcui: null, quarter: null })                 // what the charts currently describe

  let quartersPromise = null
  let statsKey = null
  let statsTicket = 0
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

  // Once per session; tried again later if it failed (the quarter select and the chart scope depend on it).
  function ensureQuarters() {
    if (!quartersPromise) quartersPromise = loadQuarters().then(() => { if (quartersError.value) quartersPromise = null })
    return quartersPromise
  }

  // The charts describe the table: same drug (tabs that use one) and the same quarter (the latest when none is chosen).
  function currentScope() {
    const f = filters.value
    return {
      rxcui: filterApplies(f.tab, 'drug') ? f.rxcui : null,
      quarter: filterApplies(f.tab, 'quarter') ? (f.quarter ?? quarters.value[0] ?? null) : null,
    }
  }

  async function track(name, work) {
    statsLoading.value[name] = true
    statsError.value[name] = null
    try {
      return await work()
    } catch (e) {
      statsError.value[name] = e
      throw e
    } finally {
      statsLoading.value[name] = false
    }
  }

  // age + sex in one request each, serious-over-time as: reports per quarter, then SERIOUS per quarter for the last 6
  // (backend request B4: there is no single call for it). A quarter that fails leaves a gap in the line, not a 0.
  async function loadStats() {
    const ticket = ++statsTicket
    const scope = currentScope()
    statsScope.value = scope
    statsKey = JSON.stringify(scope)
    const mine = () => ticket === statsTicket
    const stat = (extra) => services.signal.statistics({ rxcui: scope.rxcui, ...extra })

    const age = track('age', async () => {
      const result = ageGroups((await stat({ groupBy: 'age_group', quarter: scope.quarter })).buckets)
      if (mine()) stats.value.age = result
    })
    const sex = track('sex', async () => {
      const result = sexShares((await stat({ groupBy: 'sex', quarter: scope.quarter })).buckets)
      if (mine()) stats.value.sex = result
    })
    const serious = track('seriousOverTime', async () => {
      const all = (await stat({ groupBy: 'quarter' })).buckets
      const asked = lastQuarters(all, SERIES_QUARTERS)
      const answers = await Promise.allSettled(asked.map((quarter) => stat({ groupBy: 'seriousness', quarter })))
      const seriousByQuarter = {}
      answers.forEach((a, i) => {
        if (a.status !== 'fulfilled') return
        const bucket = a.value.buckets.find((x) => x.group === 'SERIOUS')
        seriousByQuarter[asked[i]] = bucket ? bucket.value : 0
      })
      if (asked.length && !Object.keys(seriousByQuarter).length) throw answers[0].reason   // every quarter failed
      if (mine()) stats.value.seriousOverTime = seriousSeries(all, seriousByQuarter, SERIES_QUARTERS)
    })
    await Promise.allSettled([age, sex, serious])
  }

  // Reload the charts only when what they describe (drug, quarter) changed; paging or sorting does not.
  async function refreshStats() {
    await ensureQuarters()
    if (JSON.stringify(currentScope()) !== statsKey) await loadStats()
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

  // Called by the view with route.query on enter and whenever the query changes. `defaults` is what is not in the URL
  // (the user's own minimum reports from the alert settings).
  async function applyQuery(query, defaults = {}) {
    filters.value = filtersFromQuery(query, defaults)
    closeReports()                    // the rows the drawer belonged to are gone
    await Promise.all([loadTable(), refreshStats()])
  }

  return {
    filters, list, labelGaps, usedQuarter, matchCoverage, disclaimer, tableLoading, tableError, quarters, quartersError,
    needsDrug, drugName, reportsDrawer, stats, statsLoading, statsError, statsScope, loadQuarters, ensureQuarters, loadStats, loadTable, applyQuery, openReports, loadReportsPage, closeReports,
  }
})
