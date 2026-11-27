import { describe, expect, it } from 'vitest'
import {
  isRunning, parseIncremental, parseWindow, quarterToPreview, reconcileEntries, runDuration, runState, runTypeLabel,
} from '@/domain/rules/admin'

const run = (over = {}) => ({ id: 'r', type: 'INCREMENTAL', startedAt: '2026-11-25T03:00:00Z', endedAt: '2026-11-25T03:00:42Z', errors: [], stats: {}, ...over })

describe('runState / isRunning', () => {
  it('a run without an end time is running', () => {
    expect(runState(run({ endedAt: null }))).toEqual({ state: 'running', label: 'Running', tone: 'amber' })
  })

  it('a finished run is done; failed when it logged errors and loaded nothing', () => {
    expect(runState(run())).toEqual({ state: 'done', label: 'Done', tone: 'green' })
    expect(runState(run({ errors: ['RxNav timeout'] }))).toEqual({ state: 'failed', label: 'Failed', tone: 'coral' })
  })

  it('a run that loaded data and skipped a few bad source records is done, with the count', () => {
    const r = run({ recordsLoaded: 1575, recordsSkipped: 2, errors: ["Unexpected NDC package shape: '76045-0212-10'", 'x'] })
    expect(runState(r)).toEqual({ state: 'skipped', label: 'Done, 2 skipped', tone: 'amber' })
  })

  it('isRunning is true when any run is open', () => {
    expect(isRunning([run(), run({ endedAt: null })])).toBe(true)
    expect(isRunning([run()])).toBe(false)
    expect(isRunning([])).toBe(false)
    expect(isRunning(undefined)).toBe(false)
  })
})

describe('runTypeLabel', () => {
  it('names the known job types and passes unknown ones through', () => {
    expect(runTypeLabel('FULL_LOAD')).toBe('FAERS full load')
    expect(runTypeLabel('SHORTAGE_POLL')).toBe('Shortage poll')
    expect(runTypeLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })
})

describe('runDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(runDuration(run())).toBe('42 s')
    expect(runDuration(run({ endedAt: '2026-11-25T03:03:05Z' }))).toBe('3 min 05 s')
    expect(runDuration(run({ endedAt: '2026-11-25T04:02:00Z' }))).toBe('1 h 02 min')
  })

  it('a running job counts up to `now`', () => {
    expect(runDuration(run({ endedAt: null }), new Date('2026-11-25T03:00:10Z'))).toBe('10 s')
  })

  it('never shows a negative time (clock skew) and gives "" for an unreadable start', () => {
    expect(runDuration(run({ endedAt: null }), new Date('2026-11-25T02:59:00Z'))).toBe('0 s')
    expect(runDuration(run({ startedAt: 'nope' }))).toBe('')
  })
})

describe('quarterToPreview', () => {
  const files = [
    { name: 'a.zip', quarter: '2026Q3', quarterLoaded: true },
    { name: 'b.zip', quarter: '2026Q4', quarterLoaded: false },
    { name: 'c.zip', quarter: '2026Q1', quarterLoaded: false },
    { name: 'd.zip', quarter: null, quarterLoaded: false },
  ]

  it('is the newest ticked quarter that is not in the database yet', () => {
    expect(quarterToPreview(files, ['a.zip', 'b.zip', 'c.zip'])).toBe('2026Q4')
    expect(quarterToPreview(files, ['c.zip'])).toBe('2026Q1')
  })

  it('is null when nothing is ticked, the quarter is loaded already, or the quarter is unknown', () => {
    expect(quarterToPreview(files, [])).toBeNull()
    expect(quarterToPreview(files, ['a.zip'])).toBeNull()
    expect(quarterToPreview(files, ['d.zip'])).toBeNull()
  })
})

describe('parseWindow', () => {
  it('empty means the server default', () => {
    expect(parseWindow('')).toEqual({ ok: true, value: undefined })
    expect(parseWindow('  ')).toEqual({ ok: true, value: undefined })
    expect(parseWindow(undefined)).toEqual({ ok: true, value: undefined })
  })

  it('accepts whole numbers from 1 to 20', () => {
    expect(parseWindow('6')).toEqual({ ok: true, value: 6 })
    expect(parseWindow(' 20 ')).toEqual({ ok: true, value: 20 })
    expect(parseWindow('1').value).toBe(1)
  })

  it('refuses everything else', () => {
    for (const bad of ['0', '21', '-3', '2.5', 'six', '1e1']) expect(parseWindow(bad).ok, bad).toBe(false)
  })
})

describe('parseIncremental', () => {
  it('empty boxes give no limits', () => {
    expect(parseIncremental({ sinceDays: '', labelLimit: '' })).toEqual({ errors: {}, value: { sinceDays: undefined, labelLimit: undefined } })
  })

  it('reads both numbers', () => {
    expect(parseIncremental({ sinceDays: '7', labelLimit: '500' })).toEqual({ errors: {}, value: { sinceDays: 7, labelLimit: 500 } })
  })

  it('applies the backend ranges (1-365 days, 1-20000 labels) and names the box that is wrong', () => {
    const r = parseIncremental({ sinceDays: '366', labelLimit: '0' })
    expect(Object.keys(r.errors).sort()).toEqual(['labelLimit', 'sinceDays'])
    expect(parseIncremental({ sinceDays: '365', labelLimit: '20000' }).errors).toEqual({})
    expect(parseIncremental({ sinceDays: 'x', labelLimit: '' }).errors.sinceDays).toBeTruthy()
  })
})

describe('reconcileEntries', () => {
  it('lists the entries with readable names and values', () => {
    expect(reconcileEntries({ shortage_status_rebuilt: 12, ok: true, detail: { a: 1 }, none: null })).toEqual([
      { key: 'shortage status rebuilt', value: '12' },
      { key: 'ok', value: 'true' },
      { key: 'detail', value: '{"a":1}' },
      { key: 'none', value: 'null' },
    ])
  })

  it('is empty for no result', () => {
    expect(reconcileEntries(null)).toEqual([])
    expect(reconcileEntries(undefined)).toEqual([])
    expect(reconcileEntries('x')).toEqual([])
  })
})
