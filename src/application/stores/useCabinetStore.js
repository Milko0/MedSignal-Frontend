import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { buildRows, FILTERS, matchesFilter, sortAlerts } from '@/domain/rules/cabinet'

// A list fetched less than this long ago counts as fresh: other pages can call load() freely.
export const FRESH_MS = 60_000

// My medicines (FR-15 to FR-18): the followed drugs and the user's alerts, shared by the cabinet view, the dashboard,
// the navbar (count, alert bell) and the Drug 360 follow button.
export const useCabinetStore = defineStore('cabinet', () => {
  const followed = ref([])
  const alerts = ref([])
  const followedAt = ref(null)         // Date.now() of the last successful load of each list
  const alertsAt = ref(null)
  const loading = ref(false)
  const error = ref(null)              // why the last load() failed
  const activeFilter = ref('ALL')      // ALL | SHORTAGE | SIGNAL | LABEL | RECALL

  // A request already on its way is shared by whoever asks next (the navbar and the dashboard load at the same time),
  // and a reset (logout) makes whatever is still on its way irrelevant.
  let followedRun = null
  let alertsRun = null
  let generation = 0

  const fresh = (at) => at !== null && Date.now() - at < FRESH_MS
  const loaded = computed(() => followedAt.value !== null && alertsAt.value !== null)

  // The two lists are independent: one failing must not hide the other. These throw, so a caller (the dashboard)
  // can keep its own error per list; load() below never throws.
  function loadFollowed() {
    if (followedRun) return followedRun
    const gen = generation
    followedRun = services.cabinet.list()
      .then((list) => { if (gen === generation) { followed.value = list; followedAt.value = Date.now() } })
      .finally(() => { if (gen === generation) followedRun = null })
    return followedRun
  }
  function loadAlerts() {
    if (alertsRun) return alertsRun
    const gen = generation
    alertsRun = services.cabinet.alerts()
      .then((list) => { if (gen === generation) { alerts.value = list; alertsAt.value = Date.now() } })
      .finally(() => { if (gen === generation) alertsRun = null })
    return alertsRun
  }

  // Both lists, in parallel. Skipped while both are fresh unless `force`. Failures end up in `error`.
  async function load({ force = false } = {}) {
    if (!force && fresh(followedAt.value) && fresh(alertsAt.value)) return
    loading.value = true
    error.value = null
    const results = await Promise.allSettled([loadFollowed(), loadAlerts()])
    error.value = results.find((r) => r.status === 'rejected')?.reason ?? null
    loading.value = false
  }

  // Alerts only, quietly: for when the window regains focus. Nothing if they were fetched less than `maxAgeMs` ago.
  async function refreshAlerts({ maxAgeMs = FRESH_MS } = {}) {
    if (alertsAt.value !== null && Date.now() - alertsAt.value < maxAgeMs) return
    await loadAlerts().catch(() => {})
  }

  // After a follow or unfollow the server has changed the list, so read it again. A failing refresh must not look like a
  // failed follow (the caller would roll back); the next full load corrects the list. An older read still on its way is
  // waited for first, so its stale answer cannot overwrite the new one.
  async function refreshFollowed() {
    await followedRun?.catch(() => {})
    await loadFollowed().catch(() => {})
  }

  async function follow(rxcui) {
    await services.cabinet.follow(rxcui)
    await refreshFollowed()
  }

  // Optimistic: the drug leaves the list at once and comes back at its place if the server refuses. The error is
  // rethrown for the caller (the Drug 360 button and the cabinet view each tell the user).
  async function unfollow(rxcui) {
    const index = followed.value.findIndex((d) => d.rxcui === rxcui)
    const removed = index >= 0 ? followed.value[index] : null
    if (removed) followed.value = followed.value.filter((d) => d.rxcui !== rxcui)
    try {
      await services.cabinet.unfollow(rxcui)
    } catch (e) {
      if (removed && !followed.value.some((d) => d.rxcui === rxcui)) {
        const list = [...followed.value]
        list.splice(Math.min(index, list.length), 0, removed)
        followed.value = list
      }
      throw e
    }
    await refreshFollowed()
  }

  // FR-18: dismiss one alert / all alerts, optimistic with rollback; the error is rethrown.
  async function dismiss(id) {
    const index = alerts.value.findIndex((a) => a.id === id)
    if (index < 0) return
    const removed = alerts.value[index]
    alerts.value = alerts.value.filter((a) => a.id !== id)
    try {
      await services.cabinet.dismiss(id)
    } catch (e) {
      if (!alerts.value.some((a) => a.id === id)) {
        const list = [...alerts.value]
        list.splice(Math.min(index, list.length), 0, removed)
        alerts.value = list
      }
      throw e
    }
  }

  async function dismissAll() {
    const previous = alerts.value
    if (!previous.length) return
    alerts.value = []
    try {
      await services.cabinet.dismissAll()
    } catch (e) {
      alerts.value = previous
      throw e
    }
  }

  // Logout or an expired session: nothing of the user may stay.
  function reset() {
    generation += 1
    followedRun = null
    alertsRun = null
    followed.value = []
    alerts.value = []
    followedAt.value = null
    alertsAt.value = null
    loading.value = false
    error.value = null
    activeFilter.value = 'ALL'
  }

  const setFilter = (key) => { if (FILTERS.some((f) => f.key === key)) activeFilter.value = key }

  // ---- what the views show ----
  const rows = computed(() => buildRows(followed.value, alerts.value))
  const filteredRows = computed(() => rows.value.filter((r) => matchesFilter(r, activeFilter.value)))
  const filterCounts = computed(() => Object.fromEntries(FILTERS.map((f) => [f.key, rows.value.filter((r) => matchesFilter(r, f.key)).length])))
  // Alerts newest first, each with the name of its drug (alerts only carry the rxcui; followed drugs are the only ones that get alerts)
  const namedAlerts = computed(() => {
    const names = new Map(followed.value.map((d) => [d.rxcui, d.name]))
    return sortAlerts(alerts.value).map((a) => ({ ...a, drugName: names.get(a.rxcui) ?? a.rxcui }))
  })
  const unreadCount = computed(() => alerts.value.length)
  const followedCount = computed(() => followed.value.length)

  return {
    followed, alerts, loaded, loading, error, activeFilter, followedAt, alertsAt,
    rows, filteredRows, filterCounts, namedAlerts, unreadCount, followedCount,
    load, loadFollowed, loadAlerts, refreshAlerts, follow, unfollow, dismiss, dismissAll, reset, setFilter,
  }
})
