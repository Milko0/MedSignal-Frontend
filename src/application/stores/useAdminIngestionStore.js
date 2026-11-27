import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { services } from '@/composition/container'
import { ADMIN_PAGE_SIZE, JOB_FINISHED_BY, RUNS_POLL_MS, RUNS_WATCH_MAX_MS } from '@/core/constants/admin'
import { isRunning, quarterToPreview } from '@/domain/rules/admin'

// Data updates (FR-19 to FR-21) and the live-layer rebuild (FR-27).
//
// The triggers answer 202 at once and the job runs in the background. The backend has no "status of the job" call, and
// it writes a job's entry in the runs log only when the job FINISHES. So after a trigger (or a 409 "already running")
// the store remembers `pending` = which job it waits for + the ids of the runs that existed, and reads the log every
// few seconds until an entry of the matching type appears that was not there before (no clock comparison needed).
// The files / loaded-quarters block is read again then, because a load changes both.
// The trigger actions RETHROW (409, 422) so the view can show the message.
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

  // { kind: 'faers'|'incremental', since: ms, known: [run ids seen when it was started] } while a job is awaited
  const pending = ref(null)
  const running = computed(() => !!pending.value || isRunning(runs.value))
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
    const wasOpen = isRunning(runs.value)
    runsLoading.value = true
    runsError.value = ''
    try {
      const rows = await services.admin.ingestion.runs({ skip: (page - 1) * ADMIN_PAGE_SIZE, limit: ADMIN_PAGE_SIZE })
      if (mine !== runsSeq) return
      runs.value = rows
      runsPage.value = page
      runsLoaded.value = true
      if (wasOpen && !isRunning(rows)) loadOverview()         // a run that was open has closed: files and quarters changed
      settlePending()
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

  // ---- waiting for a background job
  // Called after every read of the log: has the awaited job left its entry, or has the wait gone on too long?
  function settlePending() {
    const p = pending.value
    if (!p) return
    const done = runs.value.some((r) => JOB_FINISHED_BY[p.kind].includes(r.type) && !p.known.includes(r.id))
    if (done || Date.now() - p.since > RUNS_WATCH_MAX_MS) {
      pending.value = null
      if (done) loadOverview()
    }
  }

  // The log is read first, so what is already in it is not mistaken for the end of the new job.
  async function markRunning(kind) {
    await loadRuns(1)
    pending.value = { kind, since: Date.now(), known: runs.value.map((r) => r.id) }
  }

  // ---- triggers
  async function trigger(kind, call) {
    starting.value = true
    try {
      const started = await call()
      await markRunning(kind)
      return started
    } catch (e) {
      if (e?.status === 409) await markRunning(kind)      // somebody else's job (or an earlier one) is running: wait for it too
      throw e
    } finally {
      starting.value = false
    }
  }

  const startFaers = ({ windowQuarters } = {}) =>
    trigger('faers', () => services.admin.ingestion.startFaers({ files: [...selected.value], windowQuarters }))

  const startIncremental = (limits) => trigger('incremental', () => services.admin.ingestion.startIncremental(limits))

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
      if (pending.value) loadRuns(1)                           // the new entry lands on page 1
      else if (isRunning(runs.value)) loadRuns()
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
    pending.value = null
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
    runsHasNext, runsHasPrev, running, pending, starting, reconciling, reconcileResult,
    loadOverview, loadRuns, nextRuns, prevRuns, select, startFaers, startIncremental, reconcile, startWatching, stopWatching, reset,
  }
})
