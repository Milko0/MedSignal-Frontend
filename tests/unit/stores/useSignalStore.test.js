import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'
import { DISCLAIMER_TEXT, labelGapsData, signalList, signalReports } from '../../helpers/fixtures'
import { toPage } from '@/infrastructure/mappers/commonMapper'
import { toReportBrief } from '@/infrastructure/mappers/reportMapper'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useSignalStore } = await import('@/application/stores/useSignalStore')

setupPinia()

const list = (over = {}) => ({ ...toSignalList({ ...signalList, ...over }), disclaimer: DISCLAIMER_TEXT })
const gaps = () => ({ ...toLabelGaps(labelGapsData), disclaimer: DISCLAIMER_TEXT })
const failure = (status = 500) => Object.assign(new Error('boom'), { status })
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  services.signal.list.mockResolvedValue(list())
  services.signal.emerging.mockResolvedValue(list())
  services.drug.getLabelGaps.mockResolvedValue(gaps())
})

describe('applyQuery', () => {
  it('reads the filters from the query', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'all', rxcui: '5640', drug: 'IBUPROFEN', reaction: 'nausea', quarter: '2026Q2', min: '50', page: '3' })

    expect(store.filters).toMatchObject({ tab: 'all', rxcui: '5640', drugName: 'IBUPROFEN', reaction: 'nausea', quarter: '2026Q2', minReports: 50, page: 3 })
  })

  it('goes back to the defaults when the query is empty', async () => {
    const store = useSignalStore()
    await store.applyQuery({ rxcui: '5640', page: '4' })

    await store.applyQuery({})

    expect(store.filters.rxcui).toBeNull()
    expect(store.filters.page).toBe(1)
  })
})

describe('tab -> service', () => {
  it('all: GET /signals with the filters, no quarter when none was chosen, and the default minimum of 20', async () => {
    const store = useSignalStore()

    await store.applyQuery({})

    expect(services.signal.list).toHaveBeenCalledWith({
      quarter: null, rxcui: null, reaction: '', minReports: 20, onlySignals: true, page: 1, pageSize: 10,
    })
    expect(services.signal.emerging).not.toHaveBeenCalled()
    expect(services.drug.getLabelGaps).not.toHaveBeenCalled()
  })

  it('all: sends rxcui (not a name), reaction, quarter, minimum, "show all pairs" and the page', async () => {
    const store = useSignalStore()

    await store.applyQuery({ rxcui: '5640', drug: 'IBUPROFEN', reaction: 'nausea', quarter: '2026Q2', min: '5', all: '1', page: '2' })

    expect(services.signal.list).toHaveBeenCalledWith({
      quarter: '2026Q2', rxcui: '5640', reaction: 'nausea', minReports: 5, onlySignals: false, page: 2, pageSize: 10,
    })
  })

  it('emerging: GET /signals/emerging with only quarter, minimum 3 by default and the page', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'emerging', rxcui: '5640', reaction: 'nausea', page: '2' })

    expect(services.signal.emerging).toHaveBeenCalledWith({ quarter: null, minReports: 3, page: 2, pageSize: 10 })
    expect(services.signal.list).not.toHaveBeenCalled()
  })

  it('emerging: an explicit minimum wins over the default', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'emerging', min: '10', quarter: '2026Q1' })

    expect(services.signal.emerging).toHaveBeenCalledWith({ quarter: '2026Q1', minReports: 10, page: 1, pageSize: 10 })
  })

  it('gaps: GET /drugs/{rxcui}/label-gaps with the minimum', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'gaps', rxcui: '5640' })

    expect(services.drug.getLabelGaps).toHaveBeenCalledWith('5640', 20)
    expect(services.signal.list).not.toHaveBeenCalled()
    expect(store.labelGaps.gaps).toHaveLength(2)
    expect(store.list).toBeNull()
  })

  it('gaps without a drug asks for nothing and says a drug is needed', async () => {
    const store = useSignalStore()

    await store.applyQuery({ tab: 'gaps' })

    expect(services.drug.getLabelGaps).not.toHaveBeenCalled()
    expect(services.signal.list).not.toHaveBeenCalled()
    expect(store.needsDrug).toBe(true)
    expect(store.tableLoading).toBe(false)
    expect(store.labelGaps).toBeNull()
  })

  it('clears the other tab\'s data when the tab changes', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    expect(store.list.items).toHaveLength(1)

    await store.applyQuery({ tab: 'gaps', rxcui: '5640' })
    expect(store.list).toBeNull()
    expect(store.labelGaps).not.toBeNull()

    await store.applyQuery({})
    expect(store.labelGaps).toBeNull()
    expect(store.list.items).toHaveLength(1)
  })
})

describe('table result', () => {
  it('keeps the page model, the quarter the backend used, the coverage and the disclaimer', async () => {
    services.signal.list.mockResolvedValue(list({ quarter: '2026Q3', match_coverage: 0.87 }))
    const store = useSignalStore()

    await store.applyQuery({})

    expect(store.list).toMatchObject({ total: 41, page: 2, pageSize: 10, totalPages: 5 })
    expect(store.list.items[0].drug).toBe('ibuprofen')
    expect(store.usedQuarter).toBe('2026Q3')
    expect(store.matchCoverage).toBe(0.87)
    expect(store.disclaimer).toBe(DISCLAIMER_TEXT)
    expect(store.tableLoading).toBe(false)
    expect(store.tableError).toBeNull()
  })

  it('is loading while the request runs', async () => {
    const pending = deferred()
    services.signal.list.mockReturnValue(pending.promise)
    const store = useSignalStore()

    const loading = store.applyQuery({})
    expect(store.tableLoading).toBe(true)
    pending.resolve(list())
    await loading

    expect(store.tableLoading).toBe(false)
  })

  it('keeps the error, empties the table and stops loading when the request fails', async () => {
    const store = useSignalStore()
    await store.applyQuery({})
    services.signal.list.mockRejectedValue(failure(500))

    await store.applyQuery({ page: '2' })

    expect(store.tableError.status).toBe(500)
    expect(store.list).toBeNull()
    expect(store.tableLoading).toBe(false)
  })

  it('clears the error on the next successful load', async () => {
    services.signal.list.mockRejectedValueOnce(failure())
    const store = useSignalStore()
    await store.applyQuery({})

    await store.loadTable()

    expect(store.tableError).toBeNull()
    expect(store.list.items).toHaveLength(1)
  })

  it('takes the drug name from the URL, else from the rows of the table', async () => {
    const store = useSignalStore()
    await store.applyQuery({ rxcui: '5640', drug: 'IBUPROFEN FROM URL' })
    expect(store.drugName).toBe('IBUPROFEN FROM URL')

    await store.applyQuery({ rxcui: '5640' })
    expect(store.drugName).toBe('ibuprofen')   // the fixture row for rxcui 5640

    await store.applyQuery({})
    expect(store.drugName).toBeNull()
  })
})

describe('stale responses', () => {
  it('ignores an answer that arrives after a newer request', async () => {
    const slow = deferred()
    services.signal.list.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(list({ total: 7 }))
    const store = useSignalStore()

    const first = store.applyQuery({ reaction: 'nau' })
    await store.applyQuery({ reaction: 'nausea' })
    slow.resolve(list({ total: 999 }))
    await first

    expect(store.list.total).toBe(7)
    expect(store.tableLoading).toBe(false)
  })

  it('ignores the error of a request that was overtaken', async () => {
    const slow = deferred()
    services.signal.list.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(list())
    const store = useSignalStore()

    const first = store.applyQuery({ reaction: 'nau' })
    await store.applyQuery({ reaction: 'nausea' })
    slow.reject(failure())
    await first

    expect(store.tableError).toBeNull()
    expect(store.list).not.toBeNull()
  })

  it('ignores an answer of another tab that arrives late', async () => {
    const slow = deferred()
    services.signal.list.mockReturnValueOnce(slow.promise)
    const store = useSignalStore()

    const first = store.applyQuery({})
    await store.applyQuery({ tab: 'gaps', rxcui: '5640' })
    slow.resolve(list({ total: 999 }))
    await first

    expect(store.list).toBeNull()
    expect(store.labelGaps).not.toBeNull()
  })

  it('a request overtaken by "needs a drug" does not repopulate the table', async () => {
    const slow = deferred()
    services.signal.list.mockReturnValueOnce(slow.promise)
    const store = useSignalStore()

    const first = store.applyQuery({})
    await store.applyQuery({ tab: 'gaps' })
    slow.resolve(list())
    await first

    expect(store.list).toBeNull()
    expect(store.needsDrug).toBe(true)
  })
})

describe('loadQuarters', () => {
  it('lists the quarters newest first', async () => {
    services.signal.statistics.mockResolvedValue(toStatistics({
      group_by: 'quarter', buckets: [{ group: '2025Q4', value: 1 }, { group: '2026Q3', value: 3 }, { group: '2026Q1', value: 2 }],
    }))
    const store = useSignalStore()

    await store.loadQuarters()

    expect(services.signal.statistics).toHaveBeenCalledWith({ groupBy: 'quarter' })
    expect(store.quarters).toEqual(['2026Q3', '2026Q1', '2025Q4'])
  })

  it('keeps the error and an empty list when it fails, without breaking the table', async () => {
    services.signal.statistics.mockRejectedValue(failure())
    const store = useSignalStore()

    await store.loadQuarters()
    await store.applyQuery({})

    expect(store.quarters).toEqual([])
    expect(store.quartersError.status).toBe(500)
    expect(store.list).not.toBeNull()
  })
})

describe('reports drawer', () => {
  const row = { rxcui: '5640', drug: 'IBUPROFEN', reaction: 'NAUSEA' }
  const reportsPage = (over = {}) => toPage({ ...signalReports, ...over }, toReportBrief)

  beforeEach(() => { services.signal.reports.mockResolvedValue(reportsPage()) })

  it('starts closed and empty', () => {
    const d = useSignalStore().reportsDrawer

    expect(d.open).toBe(false)
    expect(d.items).toEqual([])
  })

  it("opens for a row and loads page 1 with the row's rxcui and reaction", async () => {
    const store = useSignalStore()

    await store.openReports(row)

    expect(services.signal.reports).toHaveBeenCalledWith('5640', 'NAUSEA', { page: 1, pageSize: 10 })
    expect(store.reportsDrawer).toMatchObject({ open: true, drug: 'IBUPROFEN', reaction: 'NAUSEA', total: 1, page: 1, totalPages: 1, loading: false })
    expect(store.reportsDrawer.items[0].id).toBe('10234567')
  })

  it('is loading while the request runs', async () => {
    const pending = deferred()
    services.signal.reports.mockReturnValue(pending.promise)
    const store = useSignalStore()

    const opening = store.openReports(row)
    expect(store.reportsDrawer.open).toBe(true)
    expect(store.reportsDrawer.loading).toBe(true)
    pending.resolve(reportsPage())
    await opening

    expect(store.reportsDrawer.loading).toBe(false)
  })

  it('loads another page', async () => {
    const store = useSignalStore()
    await store.openReports(row)
    services.signal.reports.mockResolvedValue(reportsPage({ page: 3, total: 50, total_pages: 5 }))

    await store.loadReportsPage(3)

    expect(services.signal.reports).toHaveBeenLastCalledWith('5640', 'NAUSEA', { page: 3, pageSize: 10 })
    expect(store.reportsDrawer).toMatchObject({ page: 3, totalPages: 5, total: 50 })
  })

  it('does nothing when the drawer is closed', async () => {
    const store = useSignalStore()

    await store.loadReportsPage(2)

    expect(services.signal.reports).not.toHaveBeenCalled()
  })

  it('sends the reaction as it is (the adapter encodes it), including a "/"', async () => {
    const store = useSignalStore()

    await store.openReports({ ...row, reaction: 'OEDEMA/EFFUSION' })

    expect(services.signal.reports).toHaveBeenCalledWith('5640', 'OEDEMA/EFFUSION', { page: 1, pageSize: 10 })
  })

  it('marks the drawer unavailable on a 404 (backend request B2), not as an error', async () => {
    services.signal.reports.mockRejectedValue(failure(404))
    const store = useSignalStore()

    await store.openReports({ ...row, reaction: 'OEDEMA/EFFUSION' })

    expect(store.reportsDrawer.unavailable).toBe(true)
    expect(store.reportsDrawer.error).toBeNull()
    expect(store.reportsDrawer.items).toEqual([])
    expect(store.reportsDrawer.loading).toBe(false)
  })

  it('keeps any other failure as an error and clears it on the next load', async () => {
    services.signal.reports.mockRejectedValueOnce(failure(500))
    const store = useSignalStore()
    await store.openReports(row)
    expect(store.reportsDrawer.error.status).toBe(500)
    expect(store.reportsDrawer.unavailable).toBe(false)

    await store.loadReportsPage(1)

    expect(store.reportsDrawer.error).toBeNull()
    expect(store.reportsDrawer.items).toHaveLength(1)
  })

  it('closing empties the drawer and drops an answer still on its way', async () => {
    const pending = deferred()
    services.signal.reports.mockReturnValue(pending.promise)
    const store = useSignalStore()

    const opening = store.openReports(row)
    store.closeReports()
    pending.resolve(reportsPage())
    await opening

    expect(store.reportsDrawer.open).toBe(false)
    expect(store.reportsDrawer.items).toEqual([])
  })

  it('opening another row starts clean and an older answer cannot overwrite it', async () => {
    const slow = deferred()
    services.signal.reports.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(reportsPage({ total: 7 }))
    const store = useSignalStore()

    const first = store.openReports(row)
    await store.openReports({ rxcui: '1', drug: 'OTHER', reaction: 'RASH' })
    slow.resolve(reportsPage({ total: 999 }))
    await first

    expect(store.reportsDrawer).toMatchObject({ drug: 'OTHER', total: 7 })
  })

  it('closes when the filters change (the rows it belonged to are gone)', async () => {
    const store = useSignalStore()
    await store.openReports(row)

    await store.applyQuery({ reaction: 'nausea' })

    expect(store.reportsDrawer.open).toBe(false)
  })
})
