import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'
import { DISCLAIMER_TEXT, signalList } from '../../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useSignalStore } = await import('@/application/stores/useSignalStore')

setupPinia()

const QUARTERS = ['2025Q4', '2026Q1', '2026Q2', '2026Q3']
const ALL = { '2025Q4': 22307, '2026Q1': 22343, '2026Q2': 22608, '2026Q3': 19520 }
const SERIOUS = { '2025Q4': 12000, '2026Q1': 12500, '2026Q2': 12700, '2026Q3': 10806 }
const failure = (status = 500) => Object.assign(new Error('boom'), { status })
const stat = (group_by, buckets) => toStatistics({ group_by, buckets })

// A statistics backend: answers by `groupBy`; `broken(params)` makes a call fail.
function backend({ broken = () => false } = {}) {
  services.signal.statistics.mockImplementation(async (params) => {
    if (broken(params)) throw failure()
    switch (params.groupBy) {
      case 'quarter':
        return stat('quarter', Object.entries(ALL).map(([group, value]) => ({ group, value })))
      case 'age_group':
        return stat('age_group', [{ group: 'UNKNOWN', value: 30 }, { group: '75+', value: 10 }, { group: '0-17', value: 5 }, { group: '45-64', value: 20 }])
      case 'sex':
        return stat('sex', [{ group: 'MALE', value: 1 }, { group: 'FEMALE', value: 1 }, { group: 'UNKNOWN', value: 1 }])
      case 'seriousness':
        return stat('seriousness', [{ group: 'SERIOUS', value: SERIOUS[params.quarter] }, { group: 'NON_SERIOUS', value: 5 }])
      default:
        throw new Error(`unexpected ${params.groupBy}`)
    }
  })
}
const calls = (groupBy) => services.signal.statistics.mock.calls.map(([p]) => p).filter((p) => p.groupBy === groupBy)
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  services.signal.list.mockResolvedValue({ ...toSignalList(signalList), disclaimer: DISCLAIMER_TEXT })
  services.signal.emerging.mockResolvedValue({ ...toSignalList(signalList), disclaimer: DISCLAIMER_TEXT })
  services.drug.getLabelGaps.mockResolvedValue({ labelAvailable: true, comparable: true, note: null, gaps: [], disclaimer: null })
  backend()
})

describe('statistics scope', () => {
  it('describes the latest quarter of all drugs when nothing is chosen, with the group_by the backend requires', async () => {
    const store = useSignalStore()

    await store.applyQuery({})

    expect(calls('age_group')).toEqual([{ rxcui: null, groupBy: 'age_group', quarter: '2026Q3' }])
    expect(calls('sex')).toEqual([{ rxcui: null, groupBy: 'sex', quarter: '2026Q3' }])
    expect(store.statsScope).toEqual({ rxcui: null, quarter: '2026Q3' })
  })

  it('follows the drug and the quarter of the table', async () => {
    const store = useSignalStore()

    await store.applyQuery({ rxcui: '5640', quarter: '2026Q1' })

    expect(calls('age_group')).toEqual([{ rxcui: '5640', groupBy: 'age_group', quarter: '2026Q1' }])
    expect(calls('sex')).toEqual([{ rxcui: '5640', groupBy: 'sex', quarter: '2026Q1' }])
  })

  it('Emerging tab: quarter only, a drug in the URL is not part of the scope', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'emerging', rxcui: '5640', quarter: '2026Q2' })

    expect(store.statsScope).toEqual({ rxcui: null, quarter: '2026Q2' })
  })

  it('Label gaps tab: the drug, over all quarters', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'gaps', rxcui: '5640', quarter: '2026Q2' })

    expect(store.statsScope).toEqual({ rxcui: '5640', quarter: null })
    expect(calls('age_group')[0]).toEqual({ rxcui: '5640', groupBy: 'age_group', quarter: null })
  })

  it('describes all quarters when the quarters could not be loaded', async () => {
    backend({ broken: (p) => p.groupBy === 'quarter' && p.quarter === undefined && p.rxcui === undefined })
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.quarters).toEqual([])
    expect(store.statsScope.quarter).toBeNull()
    expect(store.stats.age).not.toBeNull()
  })

  it('loads the quarters once, not on every query', async () => {
    const store = useSignalStore()

    await store.applyQuery({})
    await store.applyQuery({ reaction: 'nausea' })
    await store.applyQuery({ reaction: 'nausea', page: '2' })

    expect(services.signal.statistics.mock.calls.filter(([p]) => p.groupBy === 'quarter' && !('rxcui' in p)).length).toBe(1)
  })
})

describe('when the charts reload', () => {
  it('not for a new page, reaction, minimum or tab change that keeps the scope', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    services.signal.statistics.mockClear()

    await store.applyQuery({ page: '2' })
    await store.applyQuery({ reaction: 'nausea' })
    await store.applyQuery({ min: '50', all: '1' })

    expect(services.signal.statistics).not.toHaveBeenCalled()
  })

  it('when the drug changes', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    services.signal.statistics.mockClear()

    await store.applyQuery({ rxcui: '5640' })

    expect(calls('age_group')).toHaveLength(1)
    expect(calls('age_group')[0].rxcui).toBe('5640')
  })

  it('when the quarter changes, and when the tab changes the scope', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    services.signal.statistics.mockClear()

    await store.applyQuery({ quarter: '2026Q1' })
    expect(calls('age_group')).toHaveLength(1)

    await store.applyQuery({ tab: 'gaps', rxcui: '5640' })
    expect(calls('age_group')).toHaveLength(2)
  })

  it('on an explicit loadStats (Retry, or Apply on unchanged filters)', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    services.signal.statistics.mockClear()

    await store.loadStats()

    expect(calls('age_group')).toHaveLength(1)
  })
})

describe('shaped data', () => {
  it('age groups in fixed order with Unknown last', async () => {
    const store = useSignalStore()

    await store.applyQuery({})

    expect(Object.keys(store.stats.age)).toEqual(['0-17', '45-64', '75+', 'Unknown'])
    expect(store.stats.age.Unknown).toBe(30)
  })

  it('sex as percentages that add up to 100', async () => {
    const store = useSignalStore()

    await store.applyQuery({})

    const values = Object.values(store.stats.sex)
    expect(Object.keys(store.stats.sex)).toEqual(['Female', 'Male', 'Unknown'])
    expect(Math.round(values.reduce((a, b) => a + b, 0) * 10) / 10).toBe(100)
  })

  it('serious over time: reports per quarter without a quarter filter, then SERIOUS per quarter', async () => {
    const store = useSignalStore()

    await store.applyQuery({ rxcui: '5640', quarter: '2026Q1' })

    const overTime = calls('quarter').find((p) => 'rxcui' in p)
    expect(overTime).toEqual({ rxcui: '5640', groupBy: 'quarter' })
    expect(calls('seriousness').map((p) => p.quarter)).toEqual(QUARTERS)
    expect(calls('seriousness').every((p) => p.rxcui === '5640')).toBe(true)
    expect(store.stats.seriousOverTime).toEqual([
      { reaction: 'All reports', months: QUARTERS, counts: QUARTERS.map((q) => ALL[q]) },
      { reaction: 'Serious', months: QUARTERS, counts: QUARTERS.map((q) => SERIOUS[q]) },
    ])
  })

  it('asks for at most the last 6 quarters', async () => {
    const many = ['2024Q3', '2024Q4', '2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2', '2026Q3']
    services.signal.statistics.mockImplementation(async (p) => {
      if (p.groupBy === 'quarter') return stat('quarter', many.map((group) => ({ group, value: 10 })))
      if (p.groupBy === 'seriousness') return stat('seriousness', [{ group: 'SERIOUS', value: 4 }])
      return stat(p.groupBy, [])
    })
    const store = useSignalStore()

    await store.applyQuery({})

    expect(calls('seriousness').map((p) => p.quarter)).toEqual(['2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2', '2026Q3'])
    expect(store.stats.seriousOverTime[0].months).toHaveLength(6)
  })

  it('a quarter without a SERIOUS bucket counts as 0 serious, not as a gap', async () => {
    services.signal.statistics.mockImplementation(async (p) => {
      if (p.groupBy === 'quarter') return stat('quarter', [{ group: '2026Q3', value: 10 }])
      if (p.groupBy === 'seriousness') return stat('seriousness', [{ group: 'NON_SERIOUS', value: 10 }])
      return stat(p.groupBy, [])
    })
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.stats.seriousOverTime[1].counts).toEqual([0])
  })

  it('a drug with no reports gives empty charts, not errors', async () => {
    services.signal.statistics.mockImplementation(async (p) => stat(p.groupBy, []))
    const store = useSignalStore()

    await store.applyQuery({ rxcui: '1' })

    expect(store.stats.age).toEqual({})
    expect(store.stats.sex).toEqual({})
    expect(store.stats.seriousOverTime).toEqual([])
    expect(store.statsError).toEqual({ age: null, sex: null, seriousOverTime: null })
  })
})

describe('failures', () => {
  it('tolerates one failed quarter: that point is a gap (null), the rest of the line stays', async () => {
    backend({ broken: (p) => p.groupBy === 'seriousness' && p.quarter === '2026Q1' })
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.stats.seriousOverTime[1].counts).toEqual([12000, null, 12700, 10806])
    expect(store.stats.seriousOverTime[0].counts).toEqual([22307, 22343, 22608, 19520])
    expect(store.statsError.seriousOverTime).toBeNull()
  })

  it('shows an error for the serious chart only when every quarter fails', async () => {
    backend({ broken: (p) => p.groupBy === 'seriousness' })
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.statsError.seriousOverTime.status).toBe(500)
    expect(store.stats.seriousOverTime).toBeNull()
    expect(store.stats.age).not.toBeNull()
    expect(store.stats.sex).not.toBeNull()
    expect(store.statsLoading.seriousOverTime).toBe(false)
  })

  it('an age failure leaves sex and serious-over-time alone, and Retry loads it', async () => {
    let failAge = true
    backend({ broken: (p) => p.groupBy === 'age_group' && failAge })
    const store = useSignalStore()
    await store.applyQuery({})
    expect(store.statsError.age).not.toBeNull()
    expect(store.stats.age).toBeNull()
    expect(store.stats.sex).not.toBeNull()
    expect(store.stats.seriousOverTime).not.toBeNull()

    failAge = false
    await store.loadStats()

    expect(store.statsError.age).toBeNull()
    expect(Object.keys(store.stats.age)).toContain('Unknown')
  })

  it('a failing chart does not break the table', async () => {
    services.signal.statistics.mockRejectedValue(failure())
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.list.items).toHaveLength(1)
    expect(store.tableError).toBeNull()
  })

  it('is loading while the requests run', async () => {
    const gate = deferred()
    services.signal.statistics.mockImplementation(async (p) => {
      if (p.groupBy === 'age_group') await gate.promise
      return stat(p.groupBy, [])
    })
    const store = useSignalStore()

    const applying = store.applyQuery({})
    await vi.waitFor(() => expect(store.statsLoading.age).toBe(true))
    gate.resolve()
    await applying

    expect(store.statsLoading.age).toBe(false)
  })
})

describe('stale answers', () => {
  it('an older chart request that finishes last does not overwrite the newer one', async () => {
    const slow = deferred()
    let n = 0
    services.signal.statistics.mockImplementation(async (p) => {
      if (p.groupBy === 'age_group') {
        n += 1
        if (n === 1) await slow.promise
        return stat('age_group', [{ group: n === 1 ? 'OLD' : '45-64', value: 1 }])
      }
      return stat(p.groupBy, p.groupBy === 'quarter' ? Object.entries(ALL).map(([group, value]) => ({ group, value })) : [])
    })
    const store = useSignalStore()

    const first = store.applyQuery({ rxcui: '1' })
    await vi.waitFor(() => expect(n).toBe(1))
    await store.applyQuery({ rxcui: '2' })
    slow.resolve()
    await first

    expect(Object.keys(store.stats.age)).toEqual(['45-64'])
  })
})
