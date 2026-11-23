import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import { isInShortage } from '@/domain/rules/shortageStatus'

const EMERGING_ROWS = 5   // rows in the "Emerging signals" card
// Pairs with very few reports reach huge ratios by chance (5 reports, PRR 8000): the dashboard shows sturdier ones.
export const EMERGING_MIN_REPORTS = 10
const LATEST_ALERTS = 4   // alerts in the "Latest alerts" card

// Dashboard (FR-06, FR-17, FR-18). The emerging signals belong to this store; the followed drugs and the alerts stay
// in the cabinet store (the navbar counts them too), this store only loads them and remembers what failed.
// Every part loads and fails on its own, so one broken card never blanks the page.
export const useDashboardStore = defineStore('dashboard', () => {
  const auth = useAuthStore()
  const cabinet = useCabinetStore()

  const emerging = ref(null)   // SignalList (quarter, total, items, disclaimer); null until loaded
  const emergingLoading = ref(false)
  const emergingError = ref(null)
  const followedLoading = ref(false)
  const followedError = ref(null)
  const alertsLoading = ref(false)
  const alertsError = ref(null)

  // Runs `fn`, keeps its failure in `error` instead of throwing.
  async function track(loading, error, fn) {
    loading.value = true
    error.value = null
    try { await fn() } catch (e) { error.value = e } finally { loading.value = false }
  }

  // No quarter: the backend uses the latest one and says which (emerging.quarter).
  const loadEmerging = () => track(emergingLoading, emergingError, async () => {
    emerging.value = await services.signal.emerging({ pageSize: EMERGING_ROWS, minReports: EMERGING_MIN_REPORTS })
  })
  const loadFollowed = () => track(followedLoading, followedError, () => cabinet.loadFollowed())
  const loadAlerts = () => track(alertsLoading, alertsError, () => cabinet.loadAlerts())

  // A guest only gets the emerging signals: /cabinet needs a login, a 401 there would be noise.
  async function load() {
    const tasks = [loadEmerging()]
    if (auth.loggedIn) tasks.push(loadFollowed(), loadAlerts())
    await Promise.allSettled(tasks)
  }

  // Tiles (users). A count is null when its load failed and there is nothing to count, so the tile shows a dash
  // instead of a wrong 0. Data from an earlier successful load is still counted.
  const unknown = (error, list) => !!error && list.length === 0
  const followedCount = computed(() => (unknown(followedError.value, cabinet.followed) ? null : cabinet.followed.length))
  const inShortageCount = computed(() => (
    unknown(followedError.value, cabinet.followed) ? null : cabinet.followed.filter((d) => isInShortage(d.shortageStatus)).length
  ))
  const alertCount = computed(() => (unknown(alertsError.value, cabinet.alerts) ? null : cabinet.alerts.length))
  const emergingCount = computed(() => emerging.value?.total ?? null)

  // The newest alerts, each with its drug's name (resolved by the cabinet store)
  const latestAlerts = computed(() => cabinet.namedAlerts.slice(0, LATEST_ALERTS))

  return {
    emerging, emergingLoading, emergingError, followedLoading, followedError, alertsLoading, alertsError,
    followedCount, inShortageCount, alertCount, emergingCount, latestAlerts,
    load, loadEmerging, loadFollowed, loadAlerts,
  }
})
