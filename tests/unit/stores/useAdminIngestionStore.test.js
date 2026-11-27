import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAdminIngestionStore } = await import('@/application/stores/useAdminIngestionStore')
const { RUNS_POLL_MS, RUNS_WATCH_GRACE_MS, ADMIN_PAGE_SIZE } = await import('@/core/constants/admin')

setupPinia()

const file = (name, quarter, quarterLoaded = false) => ({ name, quarter, sizeMb: 10, modifiedAt: '2026-11-01T00:00:00Z', quarterLoaded })
const FILES = [file('q4.zip', '2026Q4'), file('q3.zip', '2026Q3', true)]
const QUARTERS = { windowQuarters: 6, quarters: ['2026Q2', '2026Q3'], adding: null, wouldDrop: [] }
const run = (id, over = {}) => ({ id, type: 'INCREMENTAL', source: 'openfda', startedAt: '2026-11-25T03:00:00Z', endedAt: '2026-11-25T03:01:00Z', recordsLoaded: 1, recordsSkipped: 0, errors: [], stats: {}, ...over })
const failure = (status, message) => Object.assign(new Error(message), { status, fieldErrors: {} })
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  services.admin.ingestion.faersFiles.mockResolvedValue(FILES)
  services.admin.ingestion.quarters.mockResolvedValue(QUARTERS)
  services.admin.ingestion.runs.mockResolvedValue([run('r1')])
  services.admin.ingestion.startFaers.mockResolvedValue({ job: 'faers', status: 'started', detail: 'Loading 1 file(s)' })
  services.admin.ingestion.startIncremental.mockResolvedValue({ job: 'incremental', status: 'started', detail: 'Polling openFDA' })
})
afterEach(() => { vi.useRealTimers() })

describe('overview', () => {
  it('reads the files and the loaded quarters together', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    expect(store.files).toEqual(FILES)
    expect(store.quarters).toEqual(QUARTERS)
    expect(store.overviewError).toBe('')
  })

  it('reports a failure and recovers on retry', async () => {
    services.admin.ingestion.faersFiles.mockRejectedValueOnce(failure(500, 'Server error'))
    const store = useAdminIngestionStore()
    await store.loadOverview()
    expect(store.overviewError).toBe('Server error')
    await store.loadOverview()
    expect(store.overviewError).toBe('')
    expect(store.files).toHaveLength(2)
  })

  it('forgets ticked files that are no longer in the folder', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    await store.select(['q4.zip', 'q3.zip'])
    services.admin.ingestion.faersFiles.mockResolvedValue([FILES[0]])
    await store.loadOverview()
    expect(store.selected).toEqual(['q4.zip'])
  })
})

describe('select and the window preview', () => {
  it('asks what loading the newest new quarter would drop', async () => {
    services.admin.ingestion.quarters.mockResolvedValue({ ...QUARTERS, adding: '2026Q4', wouldDrop: ['2025Q4'] })
    const store = useAdminIngestionStore()
    await store.loadOverview()
    services.admin.ingestion.quarters.mockClear()
    await store.select(['q4.zip'])
    expect(services.admin.ingestion.quarters).toHaveBeenCalledWith('2026Q4')
    expect(store.preview).toEqual({ adding: '2026Q4', wouldDrop: ['2025Q4'] })
  })

  it('has no preview for an already loaded quarter or an empty selection, and does not even ask', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    services.admin.ingestion.quarters.mockClear()
    await store.select(['q3.zip'])
    await store.select([])
    expect(services.admin.ingestion.quarters).not.toHaveBeenCalled()
    expect(store.preview).toBeNull()
  })

  it('a failing preview is dropped quietly (the server checks the load itself)', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    services.admin.ingestion.quarters.mockRejectedValue(failure(500, 'boom'))
    await store.select(['q4.zip'])
    expect(store.preview).toBeNull()
    expect(store.selected).toEqual(['q4.zip'])
  })

  it('ignores a preview answer that was overtaken by a newer selection', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    const slow = deferred()
    services.admin.ingestion.quarters.mockReturnValueOnce(slow.promise)
    const first = store.select(['q4.zip'])
    await store.select([])
    slow.resolve({ ...QUARTERS, adding: '2026Q4', wouldDrop: ['2025Q4'] })
    await first
    expect(store.preview).toBeNull()
  })
})

describe('runs log', () => {
  it('reads page 1 with skip/limit', async () => {
    const store = useAdminIngestionStore()
    await store.loadRuns(1)
    expect(services.admin.ingestion.runs).toHaveBeenCalledWith({ skip: 0, limit: ADMIN_PAGE_SIZE })
    expect(store.runs).toHaveLength(1)
    expect(store.runsLoaded).toBe(true)
  })

  it('pages with skip, and offers Next only after a full page', async () => {
    const store = useAdminIngestionStore()
    services.admin.ingestion.runs.mockResolvedValue(Array.from({ length: ADMIN_PAGE_SIZE }, (_, i) => run(`r${i}`)))
    await store.loadRuns(1)
    expect(store.runsHasNext).toBe(true)
    expect(store.runsHasPrev).toBe(false)
    services.admin.ingestion.runs.mockResolvedValue([run('last')])
    await store.nextRuns()
    expect(services.admin.ingestion.runs).toHaveBeenLastCalledWith({ skip: ADMIN_PAGE_SIZE, limit: ADMIN_PAGE_SIZE })
    expect(store.runsPage).toBe(2)
    expect(store.runsHasNext).toBe(false)
    expect(store.runsHasPrev).toBe(true)
  })

  it('keeps the old log and reports the error when reading fails', async () => {
    const store = useAdminIngestionStore()
    await store.loadRuns(1)
    services.admin.ingestion.runs.mockRejectedValue(failure(500, 'Server error'))
    await store.loadRuns(1)
    expect(store.runsError).toBe('Server error')
    expect(store.runs).toHaveLength(1)
  })

  it('knows when a run is open', async () => {
    const store = useAdminIngestionStore()
    services.admin.ingestion.runs.mockResolvedValue([run('r1', { endedAt: null })])
    await store.loadRuns(1)
    expect(store.running).toBe(true)
  })

  it('reads the files again when a running job finishes', async () => {
    const store = useAdminIngestionStore()
    services.admin.ingestion.runs.mockResolvedValue([run('r1', { endedAt: null })])
    await store.loadRuns(1)
    services.admin.ingestion.faersFiles.mockClear()
    services.admin.ingestion.runs.mockResolvedValue([run('r1')])
    await store.loadRuns(1)
    expect(services.admin.ingestion.faersFiles).toHaveBeenCalledTimes(1)
  })
})

describe('triggers', () => {
  it('startFaers sends the ticked files and the window, then shows the new run first', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    await store.select(['q4.zip'])
    const started = await store.startFaers({ windowQuarters: 4 })
    expect(services.admin.ingestion.startFaers).toHaveBeenCalledWith({ files: ['q4.zip'], windowQuarters: 4 })
    expect(started.job).toBe('faers')
    expect(services.admin.ingestion.runs).toHaveBeenCalledWith({ skip: 0, limit: ADMIN_PAGE_SIZE })
    expect(store.starting).toBe(false)
  })

  it('rethrows "already running" (409) and "file not found" (422), and is not left "starting"', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    await store.select(['q4.zip'])
    services.admin.ingestion.startFaers.mockRejectedValueOnce(failure(409, 'An ingestion job of this kind is already running'))
    await expect(store.startFaers()).rejects.toThrow('already running')
    expect(store.starting).toBe(false)
    services.admin.ingestion.startIncremental.mockRejectedValueOnce(failure(409, 'busy'))
    await expect(store.startIncremental({})).rejects.toThrow('busy')
    expect(store.starting).toBe(false)
  })

  it('startIncremental passes the limits through', async () => {
    const store = useAdminIngestionStore()
    await store.startIncremental({ sinceDays: 7, labelLimit: 100 })
    expect(services.admin.ingestion.startIncremental).toHaveBeenCalledWith({ sinceDays: 7, labelLimit: 100 })
  })

  it('reconcile keeps the answer and refreshes the log; a refusal is rethrown', async () => {
    services.admin.reconcile.mockResolvedValueOnce({ rebuilt: 3 }).mockRejectedValueOnce(failure(403, 'Insufficient permissions'))
    const store = useAdminIngestionStore()
    expect(await store.reconcile()).toEqual({ rebuilt: 3 })
    expect(store.reconcileResult).toEqual({ rebuilt: 3 })
    expect(services.admin.ingestion.runs).toHaveBeenCalled()
    await expect(store.reconcile()).rejects.toThrow('Insufficient permissions')
    expect(store.reconciling).toBe(false)
  })
})

describe('watching the log', () => {
  it('does not read anything while nothing runs and nothing was started', async () => {
    const store = useAdminIngestionStore()
    await store.loadRuns(1)
    services.admin.ingestion.runs.mockClear()
    store.startWatching()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 3)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
    store.stopWatching()
  })

  it('reads the log every tick while a run is open, and stops when it has closed', async () => {
    const store = useAdminIngestionStore()
    services.admin.ingestion.runs.mockResolvedValue([run('r1', { endedAt: null })])
    await store.loadRuns(1)
    services.admin.ingestion.runs.mockClear()
    store.startWatching()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS)
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS)
    expect(services.admin.ingestion.runs).toHaveBeenCalledTimes(2)
    services.admin.ingestion.runs.mockResolvedValue([run('r1')])
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS)         // reads it closed
    services.admin.ingestion.runs.mockClear()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 3)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
    store.stopWatching()
  })

  it('after a trigger it keeps reading for the grace period even before a run shows up, then gives up', async () => {
    const store = useAdminIngestionStore()
    await store.startIncremental({})
    store.startWatching()
    services.admin.ingestion.runs.mockClear()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS)
    expect(services.admin.ingestion.runs).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(RUNS_WATCH_GRACE_MS + RUNS_POLL_MS)
    services.admin.ingestion.runs.mockClear()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 3)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
    store.stopWatching()
  })

  it('stopWatching ends the timer, and the tab being hidden pauses it', async () => {
    const store = useAdminIngestionStore()
    services.admin.ingestion.runs.mockResolvedValue([run('r1', { endedAt: null })])
    await store.loadRuns(1)
    services.admin.ingestion.runs.mockClear()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    store.startWatching()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 2)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
    visibility.mockReturnValue('visible')
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS)
    expect(services.admin.ingestion.runs).toHaveBeenCalledTimes(1)
    store.stopWatching()
    services.admin.ingestion.runs.mockClear()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 3)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
    visibility.mockRestore()
  })

  it('reset stops the timer and empties everything', async () => {
    const store = useAdminIngestionStore()
    await store.loadOverview()
    await store.loadRuns(1)
    store.startWatching()
    store.reset()
    expect(store.files).toEqual([])
    expect(store.runs).toEqual([])
    expect(store.quarters).toBeNull()
    services.admin.ingestion.runs.mockClear()
    await vi.advanceTimersByTimeAsync(RUNS_POLL_MS * 3)
    expect(services.admin.ingestion.runs).not.toHaveBeenCalled()
  })
})
