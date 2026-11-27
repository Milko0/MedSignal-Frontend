import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useUiStore } = await import('@/application/stores/useUiStore')
const { useAdminIngestionStore } = await import('@/application/stores/useAdminIngestionStore')
const AdminIngestionView = (await import('@/presentation/views/AdminIngestionView.vue')).default

const file = (name, quarter, quarterLoaded = false) => ({ name, quarter, sizeMb: 123.4, modifiedAt: '2026-11-01T00:00:00Z', quarterLoaded })
const FILES = [file('2026q4-0001.json.zip', '2026Q4'), file('2026q3-0001.json.zip', '2026Q3', true)]
const run = (id, over = {}) => ({
  id, type: 'INCREMENTAL', source: 'openfda', startedAt: '2026-11-25T03:00:00Z', endedAt: '2026-11-25T03:00:42Z',
  recordsLoaded: 7, recordsSkipped: 1, errors: [], stats: {}, ...over,
})

let pinia
const wrappers = []
const show = async () => {
  const w = mount(AdminIngestionView, { attachTo: document.body, global: { plugins: [pinia] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const apiError = (status, message) => Object.assign(new Error(message), { status, fieldErrors: {} })
const dialog = () => document.body.querySelector('[role="dialog"]')
const click = async (el) => { el.click(); await flushPromises() }
const setValue = async (el, value) => { el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }
const tick = async (box, on = true) => { box.checked = on; box.dispatchEvent(new Event('change')); await flushPromises() }
const footerButton = (label) => [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes(label))
const buttonByText = (text) => [...document.body.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(text))

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.admin.ingestion.faersFiles.mockResolvedValue(FILES)
  services.admin.ingestion.quarters.mockResolvedValue({ windowQuarters: 6, quarters: ['2026Q2', '2026Q3'], adding: null, wouldDrop: [] })
  services.admin.ingestion.runs.mockResolvedValue([run('r1')])
  services.admin.ingestion.startFaers.mockResolvedValue({ job: 'faers', status: 'started', detail: 'Loading 1 file(s); see /api/admin/ingestion/runs' })
  services.admin.ingestion.startIncremental.mockResolvedValue({ job: 'incremental', status: 'started', detail: 'Polling openFDA' })
})
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('overview', () => {
  it('shows the loaded quarters and the window size', async () => {
    const w = await show()
    expect(w.findAll('.quarters li').map((l) => l.text())).toEqual(['2026Q2', '2026Q3'])
    expect(w.text()).toContain('newest 6 quarters')
  })

  it('lists the FAERS files with their database state', async () => {
    await show()
    const rows = [...document.body.querySelectorAll('tbody tr')].filter((r) => r.textContent.includes('.json.zip'))
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('2026Q4')
    expect(rows[0].textContent).toContain('Not loaded')
    expect(rows[1].textContent).toContain('Quarter in database')
  })

  it('explains what to do when there are no files', async () => {
    services.admin.ingestion.faersFiles.mockResolvedValue([])
    const w = await show()
    expect(w.text()).toContain('No FAERS files found')
    expect(w.text()).toContain('download_faers.py')
  })

  it('shows the file error with Retry', async () => {
    services.admin.ingestion.faersFiles.mockRejectedValueOnce(apiError(500, 'Server error'))
    const w = await show()
    expect(w.find('.card [role="alert"]').text()).toContain('Server error')
    await w.find('.card [role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('2026q4-0001.json.zip')
  })
})

describe('loading FAERS files', () => {
  it('the Load button is off until a file is ticked and counts the files', async () => {
    await show()
    const load = buttonByText('Load')
    expect(load.disabled).toBe(true)
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    expect(buttonByText('Load').disabled).toBe(false)
    expect(buttonByText('Load').textContent).toContain('1 file')
  })

  it('warns which quarters the load would remove from the database', async () => {
    services.admin.ingestion.quarters.mockImplementation((adding) => Promise.resolve(
      adding ? { windowQuarters: 6, quarters: ['2026Q2'], adding, wouldDrop: ['2025Q1', '2025Q2'] } : { windowQuarters: 6, quarters: ['2026Q2'], adding: null, wouldDrop: [] }))
    const w = await show()
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    expect(w.find('.warn').text()).toContain('Loading 2026Q4 will remove 2025Q1, 2025Q2')
  })

  it('"select all" ticks every file', async () => {
    await show()
    await tick(document.body.querySelector('input[aria-label="Select all files"]'))
    expect(useAdminIngestionStore().selected).toHaveLength(2)
  })

  it('asks for confirmation, then starts the load with the window and toasts the server detail', async () => {
    await show()
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    await setValue(document.body.querySelector('input[placeholder="server default"]'), '4')
    await click(buttonByText('Load'))
    expect(dialog().textContent).toContain('Load 1 file in the background')
    expect(services.admin.ingestion.startFaers).not.toHaveBeenCalled()

    await click(footerButton('Start loading'))
    expect(services.admin.ingestion.startFaers).toHaveBeenCalledWith({ files: ['2026q4-0001.json.zip'], windowQuarters: 4 })
    expect(dialog()).toBeNull()
    expect(useUiStore().toast.message).toContain('Loading 1 file(s)')
    expect(useAdminIngestionStore().selected).toEqual([])
  })

  it('refuses a bad window size before asking anything', async () => {
    const w = await show()
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    await setValue(document.body.querySelector('input[placeholder="server default"]'), '99')
    await click(buttonByText('Load'))
    expect(dialog()).toBeNull()
    expect(w.find('.field [role="alert"]').text()).toContain('1 to 20')
  })

  it('keeps the dialog open and shows why when the server says a job is already running', async () => {
    services.admin.ingestion.startFaers.mockRejectedValue(apiError(409, 'An ingestion job of this kind is already running'))
    await show()
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    await click(buttonByText('Load'))
    await click(footerButton('Start loading'))
    expect(dialog().querySelector('[role="alert"]').textContent).toContain('already running')
  })
})

describe('incremental update', () => {
  it('starts with no limits when the boxes are empty', async () => {
    await show()
    await click(buttonByText('Run update now'))
    expect(services.admin.ingestion.startIncremental).toHaveBeenCalledWith({ sinceDays: undefined, labelLimit: undefined })
    expect(useUiStore().toast.message).toBe('Polling openFDA')
  })

  it('sends the limits typed in', async () => {
    await show()
    await setValue(document.body.querySelector('input[placeholder="30"]'), '7')
    await setValue(document.body.querySelector('input[placeholder="all new"]'), '250')
    await click(buttonByText('Run update now'))
    expect(services.admin.ingestion.startIncremental).toHaveBeenCalledWith({ sinceDays: 7, labelLimit: 250 })
  })

  it('does not call the server for an impossible number', async () => {
    const w = await show()
    await setValue(document.body.querySelector('input[placeholder="30"]'), '400')
    await click(buttonByText('Run update now'))
    expect(services.admin.ingestion.startIncremental).not.toHaveBeenCalled()
    expect(w.text()).toContain('1 to 365')
  })

  it('says it is already running on a 409 (amber, not an error)', async () => {
    services.admin.ingestion.startIncremental.mockRejectedValue(apiError(409, 'busy'))
    await show()
    await click(buttonByText('Run update now'))
    const toast = useUiStore().toast
    expect(toast.message).toContain('already running')
    expect(toast.tone).toBe('amber')
  })

  it('shows other failures as an error toast', async () => {
    services.admin.ingestion.startIncremental.mockRejectedValue(apiError(403, 'Insufficient permissions'))
    await show()
    await click(buttonByText('Run update now'))
    expect(useUiStore().toast).toEqual({ message: 'Insufficient permissions', tone: 'coral' })
  })
})

describe('update log', () => {
  it('lists runs with job name, state, duration and counters', async () => {
    services.admin.ingestion.runs.mockResolvedValue([
      run('r1'),
      run('r2', { type: 'FULL_LOAD', errors: ['RxNav timeout'], stats: { files: 1 } }),
      run('r3', { endedAt: null }),
    ])
    const w = await show()
    const text = w.findAll('table').at(-1).text()
    expect(text).toContain('Incremental update')
    expect(text).toContain('FAERS full load')
    expect(text).toContain('Done')
    expect(text).toContain('Finished with errors')
    expect(text).toContain('Running')
    expect(text).toContain('42 s')
    expect(w.find('details').exists()).toBe(true)
  })

  it('after a trigger it says the job is running, disables that button, and ends when its entry shows up', async () => {
    const w = await show()
    await click(buttonByText('Run update now'))
    expect(w.find('.live').text()).toContain('is running')
    expect(w.find('.live').text()).toContain('appears in this log when it finishes')
    expect(buttonByText('Run update now').disabled).toBe(true)

    services.admin.ingestion.runs.mockResolvedValue([run('r-new'), run('r1')])
    await click(buttonByText('Refresh'))
    expect(w.find('.live').exists()).toBe(false)
    expect(buttonByText('Run update now').disabled).toBe(false)
  })

  it('a 409 also makes it wait for the job that is already running', async () => {
    services.admin.ingestion.startIncremental.mockRejectedValue(apiError(409, 'busy'))
    const w = await show()
    await click(buttonByText('Run update now'))
    expect(w.find('.live').text()).toContain('is running')
  })

  it('a running FAERS load disables the Load button until it is done', async () => {
    const w = await show()
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    await click(buttonByText('Load'))
    await click(footerButton('Start loading'))
    expect(w.find('.live').text()).toContain('FAERS load is running')
    await tick(document.body.querySelector('input[aria-label="Load 2026q4-0001.json.zip"]'))
    expect(buttonByText('Load').disabled).toBe(true)
  })

  it('says so when nothing has run, and offers Retry on an error', async () => {
    services.admin.ingestion.runs.mockResolvedValueOnce([])
    const w = await show()
    expect(w.text()).toContain('No updates have run yet')
    services.admin.ingestion.runs.mockRejectedValueOnce(apiError(500, 'Server error'))
    await click(buttonByText('Refresh'))
    expect(w.text()).toContain('Server error')
  })

  it('stops watching when the screen is left', async () => {
    const w = await show()
    const stop = vi.spyOn(useAdminIngestionStore(), 'stopWatching')
    w.unmount()
    wrappers.pop()
    expect(stop).toHaveBeenCalled()
  })
})

describe('rebuild the live layer', () => {
  it('asks first, then shows the result as a list', async () => {
    services.admin.reconcile.mockResolvedValue({ shortage_status_rebuilt: 12, ingredients_checked: 2816 })
    const w = await show()
    await click(buttonByText('Rebuild now'))
    expect(services.admin.reconcile).not.toHaveBeenCalled()
    await click(footerButton('Rebuild'))
    expect(services.admin.reconcile).toHaveBeenCalled()
    expect(dialog()).toBeNull()
    expect(useUiStore().toast.message).toBe('The live layer was rebuilt.')
    const result = w.find('dl.result').text()
    expect(result).toContain('shortage status rebuilt')
    expect(result).toContain('12')
    expect(result).toContain('2816')
  })

  it('keeps the dialog open with the reason when it fails', async () => {
    services.admin.reconcile.mockRejectedValue(apiError(500, 'Redis is down'))
    await show()
    await click(buttonByText('Rebuild now'))
    await click(footerButton('Rebuild'))
    expect(dialog().querySelector('[role="alert"]').textContent).toBe('Redis is down')
  })
})
