import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { services } from '@/composition/container'
import { ADMIN_PAGE_SIZE, RUNS_POLL_MS, RUNS_WATCH_GRACE_MS } from '@/core/constants/admin'
import { isRunning, quarterToPreview } from '@/domain/rules/admin'

// Data updates (FR-19 to FR-21) and the live-layer rebuild (FR-27).
//
// The triggers answer 202 at once and the job runs in the background, so the only progress there is is the runs log:
// an entry without an end time is a job still running. After a trigger the log is read every few seconds (RUNS_POLL_MS)
// while a run is open, or for a short grace period (the entry may take a moment to appear), and stops by itself.
// When a run closes, the files / loaded-quarters block is read again (a load changes both).
// The trigger actions RETHROW (409 "already running", 422 "file not found") so the view can show the message.
export const useAdminIngestionStore = defineStore('adminIngestion', () => {
  // files and quarters
  const files = ref([])
  const quarters = ref(null)                // { windowQuarters, quarters } or null until read
  const overviewLoading = ref(false)
  const overviewError = ref('')
  // what the user ticked
  const selected = ref([])
  const preview = ref(null)                 // { adding, wouldDrop } for the newest new quarter among the ticked files
  // runs log
  const runs = ref([])
  const runsPage = ref(1)
  const runsLoading = ref(false)
  const runsError = ref('')
  const runsLoaded = ref(false)
  // background work started from this screen
  const starting = ref(false)
  const reconciling = ref(false)
  const reconcileResult = ref(null)

  let overviewSeq = 0
  let runsSeq = 0
  let previewSeq = 0
  let timer = null
  let watchUntil = 0

  const running = computed(() => isRunning(runs.value))
  const runsHasNext = computed(() => runs.value.length >= ADMIN_PAGE_SIZE)
  const runsHasPrev = computed(() => runsPage.value > 1)

  async function loadOverview() {
    const mine = ++overviewSeq
    overviewLoading.value = true
    overviewError.value = ''
    try {
      const [f, q] = await Promise.all([services.admin.ingestion.faersFiles(), services.admin.ingestion.quarters()])
      if (mine !== overviewSeq) return
      files.value = f
      quarters.value = q
      selected.value = selected.value.filter((name) => f.some((x) => x.name === name))   // a file may have been removed
    } catch (e) {
      if (mine !== overviewSeq) return
      overviewError.value = e?.message || 'Could not read the FAERS files.'
    } finally {
      if (mine === overviewSeq) overviewLoading.value = false
    }
  }

  async function loadRuns(page = runsPage.value) {
    const mine = ++runsSeq
    const wasRunning = running.value
    runsLoading.value = true
    runsError.value = ''
    try {
      const rows = await services.admin.ingestion.runs({ skip: (page - 1) * ADMIN_PAGE_SIZE, limit: ADMIN_PAGE_SIZE })
      if (mine !== runsSeq) return
      runs.value = rows
      runsPage.value = page
      runsLoaded.value = true
      if (wasRunning && !isRunning(rows)) loadOverview()      // a job just finished: its files and quarters changed
    } catch (e) {
      if (mine !== runsSeq) return
      runsError.value = e?.message || 'Could not read the update log.'
    } finally {
      if (mine === runsSeq) runsLoading.value = false
    }
  }

  const nextRuns = () => (runsHasNext.value && !runsLoading.value ? loadRuns(runsPage.value + 1) : undefined)
  const prevRuns = () => (runsHasPrev.value && !runsLoading.value ? loadRuns(runsPage.value - 1) : undefined)

  // ---- tick files, preview what the load would push out of the window
  async function select(names) {
    selected.value = names
    const adding = quarterToPreview(files.value, names)
    const mine = ++previewSeq
    if (!adding) { preview.value = null; return }
    try {
      const q = await services.admin.ingestion.quarters(adding)
      if (mine === previewSeq) preview.value = { adding: q.adding ?? adding, wouldDrop: q.wouldDrop }
    } catch {
      if (mine === previewSeq) preview.value = null        // the preview is a courtesy; the load itself is checked by the server
    }
  }

  // ---- triggers
  function watch() { watchUntil = Date.now() + RUNS_WATCH_GRACE_MS }

  async function startFaers({ windowQuarters } = {}) {
    starting.value = true
    try {
      const started = await services.admin.ingestion.startFaers({ files: [...selected.value], windowQuarters })
      watch()
      await loadRuns(1)
      return started
    } finally {
      starting.value = false
    }
  }

  async function startIncremental(limits) {
    starting.value = true
    try {
      const started = await services.admin.ingestion.startIncremental(limits)
      watch()
      await loadRuns(1)
      return started
    } finally {
      starting.value = false
    }
  }

  async function reconcile() {
    reconciling.value = true
    try {
      reconcileResult.value = await services.admin.reconcile()
      await loadRuns(1)
      return reconcileResult.value
    } finally {
      reconciling.value = false
    }
  }

  // ---- polling: the view starts it on mount and stops it on unmount
  function startWatching() {
    stopWatching()
    timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      if (runsLoading.value) return
      if (running.value || Date.now() < watchUntil) loadRuns()
    }, RUNS_POLL_MS)
  }
  function stopWatching() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function reset() {
    overviewSeq++
    runsSeq++
    previewSeq++
    stopWatching()
    watchUntil = 0
    files.value = []
    quarters.value = null
    selected.value = []
    preview.value = null
    runs.value = []
    runsPage.value = 1
    runsLoaded.value = false
    runsLoading.value = false
    runsError.value = ''
    overviewLoading.value = false
    overviewError.value = ''
    starting.value = false
    reconciling.value = false
    reconcileResult.value = null
  }

  return {
    files, quarters, overviewLoading, overviewError, selected, preview, runs, runsPage, runsLoading, runsError, runsLoaded,
    runsHasNext, runsHasPrev, running, starting, reconciling, reconcileResult,
    loadOverview, loadRuns, nextRuns, prevRuns, select, startFaers, startIncremental, reconcile, startWatching, stopWatching, reset,
  }
})
