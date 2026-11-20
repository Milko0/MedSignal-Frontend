import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'
import { toDrug360 } from '@/infrastructure/mappers/drugMapper'
import { toTrendPoint } from '@/infrastructure/mappers/trendMapper'
import { alternativesData, drug360, drug360NoShortage, followedDrug, trendPoint } from '../../helpers/fixtures'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useDrugStore } = await import('@/application/stores/useDrugStore')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')
const { useUiStore } = await import('@/application/stores/useUiStore')

setupPinia()

const NONE = { dosageForm: null, route: null }
const inShortage = () => toDrug360(drug360)                       // ibuprofen, CURRENT, forms TABLET + SUSPENSION
const noShortage = () => toDrug360(drug360NoShortage)             // acetaminophen, status null
const alternatives = () => toAlternatives(alternativesData)
const trendPoints = () => [
  toTrendPoint({ ...trendPoint, month: '2026-01', reaction: 'Nausea', reports: 5 }),
  toTrendPoint({ ...trendPoint, month: '2026-02', reaction: 'Nausea', reports: 7 }),
  toTrendPoint({ ...trendPoint, month: '2026-02', reaction: 'Rash', reports: 1 }),
]

function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const failure = (status, message = 'boom') => Object.assign(new Error(message), { status })

beforeEach(() => {
  vi.resetAllMocks()
  services.auth.hasToken.mockReturnValue(false)
  services.drug.getDrug360.mockResolvedValue(inShortage())
  services.drug.getReactionTrend.mockResolvedValue(trendPoints())
  services.drug.getAlternatives.mockResolvedValue(alternatives())
})

describe('loadDrug', () => {
  it('reads the overview, then the 12-month trend and, in shortage, the alternatives', async () => {
    const store = useDrugStore()

    await store.loadDrug('5640')

    expect(services.drug.getDrug360).toHaveBeenCalledWith('5640', NONE)
    expect(services.drug.getReactionTrend).toHaveBeenCalledWith('5640', 12)
    expect(services.drug.getAlternatives).toHaveBeenCalledWith('5640', NONE)
    expect(store.current.name).toBe('ibuprofen')
    expect(store.trend).toHaveLength(3)
    expect(store.alternatives.items).toHaveLength(2)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.notFound).toBe(false)
  })

  it('waits for the overview before asking for anything else', async () => {
    const overview = deferred()
    services.drug.getDrug360.mockReturnValue(overview.promise)
    const store = useDrugStore()

    const loading = store.loadDrug('5640')
    expect(store.loading).toBe(true)
    expect(services.drug.getReactionTrend).not.toHaveBeenCalled()
    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    overview.resolve(inShortage())
    await loading

    expect(services.drug.getReactionTrend).toHaveBeenCalledOnce()
  })

  it('asks for the trend and the alternatives at the same time', async () => {
    const trend = deferred()
    services.drug.getReactionTrend.mockReturnValue(trend.promise)
    const store = useDrugStore()

    const loading = store.loadDrug('5640')
    await vi.waitFor(() => expect(services.drug.getAlternatives).toHaveBeenCalled())
    expect(store.trendLoading).toBe(true)
    trend.resolve(trendPoints())
    await loading

    expect(store.trendLoading).toBe(false)
  })

  it('does not ask for alternatives when there is no shortage record', async () => {
    services.drug.getDrug360.mockResolvedValue(noShortage())
    const store = useDrugStore()

    await store.loadDrug('161')

    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    expect(store.alternatives).toBeNull()
    expect(services.drug.getReactionTrend).toHaveBeenCalledWith('161', 12)
  })

  it('does not ask for alternatives once the shortage is resolved', async () => {
    const resolved = inShortage()
    resolved.shortage.status = 'RESOLVED'
    services.drug.getDrug360.mockResolvedValue(resolved)
    const store = useDrugStore()

    await store.loadDrug('5640')

    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
  })

  it('clears what belonged to the previous drug', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    services.drug.getDrug360.mockResolvedValue(noShortage())

    await store.loadDrug('161')

    expect(store.current.name).toBe('acetaminophen')
    expect(store.alternatives).toBeNull()
    expect(store.dosageForms).toEqual([])
  })

  it('starts a new drug with an empty selection, or the one it is given', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640', { dosageForm: 'TABLET' })
    expect(services.drug.getDrug360).toHaveBeenLastCalledWith('5640', { dosageForm: 'TABLET', route: null })

    await store.loadDrug('161')

    expect(store.selection).toEqual(NONE)
    expect(services.drug.getDrug360).toHaveBeenLastCalledWith('161', NONE)
  })

  it('keeps the forms with a shortage record for the selector', async () => {
    const store = useDrugStore()

    await store.loadDrug('5640')

    expect(store.dosageForms).toEqual(['TABLET', 'SUSPENSION'])
  })

  it('pivots the trend into the series the chart draws', async () => {
    const store = useDrugStore()

    await store.loadDrug('5640')

    expect(store.trendSeries).toEqual([
      { reaction: 'Nausea', months: ['2026-01', '2026-02'], counts: [5, 7] },
      { reaction: 'Rash', months: ['2026-01', '2026-02'], counts: [0, 1] },
    ])
  })

  describe('failures', () => {
    it('sets notFound on a 404 and asks for nothing else', async () => {
      services.drug.getDrug360.mockRejectedValue(failure(404, 'Unknown ingredient 0000000'))
      const store = useDrugStore()

      await store.loadDrug('0000000')

      expect(store.notFound).toBe(true)
      expect(store.error).toBeNull()
      expect(store.current).toBeNull()
      expect(store.loading).toBe(false)
      expect(services.drug.getReactionTrend).not.toHaveBeenCalled()
      expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    })

    it('keeps any other overview error as an error, not as "not found"', async () => {
      services.drug.getDrug360.mockRejectedValue(failure(500))
      const store = useDrugStore()

      await store.loadDrug('5640')

      expect(store.error.status).toBe(500)
      expect(store.notFound).toBe(false)
      expect(store.loading).toBe(false)
    })

    it('forgets an earlier 404 when the next drug loads', async () => {
      services.drug.getDrug360.mockRejectedValueOnce(failure(404))
      const store = useDrugStore()
      await store.loadDrug('0')

      await store.loadDrug('5640')

      expect(store.notFound).toBe(false)
      expect(store.current.name).toBe('ibuprofen')
    })

    it('keeps the page and the alternatives when only the trend fails', async () => {
      services.drug.getReactionTrend.mockRejectedValue(failure(0, 'Network Error'))
      const store = useDrugStore()

      await store.loadDrug('5640')

      expect(store.trendError.message).toBe('Network Error')
      expect(store.trend).toBeNull()
      expect(store.trendLoading).toBe(false)
      expect(store.current.name).toBe('ibuprofen')
      expect(store.alternatives.items).toHaveLength(2)
      expect(store.error).toBeNull()
    })

    it('keeps the page and the trend when only the alternatives fail', async () => {
      services.drug.getAlternatives.mockRejectedValue(failure(500))
      const store = useDrugStore()

      await store.loadDrug('5640')

      expect(store.alternativesError.status).toBe(500)
      expect(store.alternatives).toBeNull()
      expect(store.alternativesLoading).toBe(false)
      expect(store.trend).toHaveLength(3)
      expect(store.current.name).toBe('ibuprofen')
    })

    it('retries only the section that failed', async () => {
      services.drug.getReactionTrend.mockRejectedValueOnce(failure(500))
      services.drug.getAlternatives.mockRejectedValueOnce(failure(500))
      const store = useDrugStore()
      await store.loadDrug('5640')

      await store.retryTrend()
      expect(store.trendError).toBeNull()
      expect(store.trend).toHaveLength(3)
      expect(store.alternativesError).not.toBeNull()
      expect(services.drug.getDrug360).toHaveBeenCalledOnce()

      await store.retryAlternatives()
      expect(store.alternativesError).toBeNull()
      expect(store.alternatives.items).toHaveLength(2)
      expect(services.drug.getDrug360).toHaveBeenCalledOnce()
    })
  })

  describe('opening another drug (route change)', () => {
    it('ignores the overview of the drug that was left, even when it answers last', async () => {
      const slow = deferred()
      services.drug.getDrug360.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(noShortage())
      const store = useDrugStore()

      const first = store.loadDrug('5640')
      await store.loadDrug('161')
      slow.resolve(inShortage())
      await first

      expect(store.current.name).toBe('acetaminophen')
      expect(store.loading).toBe(false)
      expect(services.drug.getReactionTrend).toHaveBeenCalledTimes(1)
      expect(services.drug.getReactionTrend).toHaveBeenCalledWith('161', 12)
    })

    it('ignores the error of the drug that was left', async () => {
      const slow = deferred()
      services.drug.getDrug360.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(noShortage())
      const store = useDrugStore()

      const first = store.loadDrug('0')
      await store.loadDrug('161')
      slow.reject(failure(404))
      await first

      expect(store.notFound).toBe(false)
      expect(store.current.name).toBe('acetaminophen')
    })

    it('drops a trend that arrives after the user moved on', async () => {
      const slowTrend = deferred()
      services.drug.getReactionTrend.mockReturnValueOnce(slowTrend.promise).mockResolvedValueOnce([])
      services.drug.getDrug360.mockResolvedValueOnce(inShortage()).mockResolvedValueOnce(noShortage())
      const store = useDrugStore()

      const first = store.loadDrug('5640')
      await vi.waitFor(() => expect(services.drug.getReactionTrend).toHaveBeenCalled())
      await store.loadDrug('161')
      slowTrend.resolve(trendPoints())
      await first

      expect(store.trend).toEqual([])
    })
  })
})

describe('setSelection', () => {
  const narrowed = () => {
    const d = inShortage()
    d.selectedDosageForm = 'TABLET'
    d.shortage = { ...d.shortage, packagesInShortage: 1, packagesTotal: 1 }
    return d
  }

  it('reads the overview and the alternatives again with the selection, but not the trend', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    services.drug.getDrug360.mockResolvedValue(narrowed())

    await store.setSelection({ dosageForm: 'TABLET' })

    expect(services.drug.getDrug360).toHaveBeenLastCalledWith('5640', { dosageForm: 'TABLET', route: null })
    expect(services.drug.getAlternatives).toHaveBeenLastCalledWith('5640', { dosageForm: 'TABLET', route: null })
    expect(services.drug.getReactionTrend).toHaveBeenCalledTimes(1)
    expect(store.selection).toEqual({ dosageForm: 'TABLET', route: null })
    expect(store.current.selectedDosageForm).toBe('TABLET')
    expect(store.refreshing).toBe(false)
  })

  it('keeps the page on screen while it re-reads', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    const overview = deferred()
    services.drug.getDrug360.mockReturnValue(overview.promise)

    const running = store.setSelection({ dosageForm: 'TABLET' })

    expect(store.refreshing).toBe(true)
    expect(store.current.name).toBe('ibuprofen')
    expect(store.loading).toBe(false)
    overview.resolve(narrowed())
    await running
    expect(store.refreshing).toBe(false)
  })

  it('keeps the forms in the selector even when the narrowed overview lists none', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    const none = noShortage()
    services.drug.getDrug360.mockResolvedValue(none)

    await store.setSelection({ dosageForm: 'SUSPENSION' })

    expect(store.dosageForms).toEqual(['TABLET', 'SUSPENSION'])
  })

  it('drops the alternatives when the chosen form has no shortage', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    services.drug.getDrug360.mockResolvedValue(noShortage())
    services.drug.getAlternatives.mockClear()

    await store.setSelection({ dosageForm: 'SUSPENSION' })

    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    expect(store.alternatives).toBeNull()
  })

  it('"All forms" (no selection) asks without a form again', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    await store.setSelection({ dosageForm: 'TABLET' })

    await store.setSelection({})

    expect(services.drug.getDrug360).toHaveBeenLastCalledWith('5640', NONE)
    expect(store.selection).toEqual(NONE)
  })

  it('goes back to the previous selection and data, and says why, when the overview fails', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    services.drug.getDrug360.mockRejectedValue(failure(500))

    await store.setSelection({ dosageForm: 'TABLET' })

    expect(store.selection).toEqual(NONE)
    expect(store.selectionError.status).toBe(500)
    expect(store.current.name).toBe('ibuprofen')
    expect(store.refreshing).toBe(false)
  })

  it('does nothing before a drug is loaded', async () => {
    const store = useDrugStore()

    await store.setSelection({ dosageForm: 'TABLET' })

    expect(services.drug.getDrug360).not.toHaveBeenCalled()
  })

  it('uses only the answer of the latest selection', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    const slow = deferred()
    const latest = narrowed()
    latest.selectedDosageForm = 'SUSPENSION'
    services.drug.getDrug360.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(latest)

    const first = store.setSelection({ dosageForm: 'TABLET' })
    await store.setSelection({ dosageForm: 'SUSPENSION' })
    slow.resolve(narrowed())
    await first

    expect(store.current.selectedDosageForm).toBe('SUSPENSION')
    expect(store.selection.dosageForm).toBe('SUSPENSION')
    expect(store.refreshing).toBe(false)
  })

  it('does not touch the next drug when its answer arrives late', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')
    const slow = deferred()
    services.drug.getDrug360.mockReturnValueOnce(slow.promise)
    const running = store.setSelection({ dosageForm: 'TABLET' })
    services.drug.getDrug360.mockResolvedValue(noShortage())
    await store.loadDrug('161')

    slow.resolve(narrowed())
    await running

    expect(store.current.name).toBe('acetaminophen')
    expect(store.selection).toEqual(NONE)
  })
})

describe('toggleFollow', () => {
  function loggedIn() {
    services.auth.hasToken.mockReturnValue(true)
    services.cabinet.follow.mockResolvedValue(undefined)
    services.cabinet.unfollow.mockResolvedValue(undefined)
    services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug)])
  }

  it('does nothing for a guest', async () => {
    const store = useDrugStore()
    await store.loadDrug('5640')

    await store.toggleFollow()

    expect(services.cabinet.follow).not.toHaveBeenCalled()
    expect(services.cabinet.unfollow).not.toHaveBeenCalled()
  })

  it('does nothing before a drug is loaded', async () => {
    loggedIn()
    const store = useDrugStore()

    await store.toggleFollow()

    expect(services.cabinet.follow).not.toHaveBeenCalled()
  })

  it('follows a drug that is not followed, flipping the button at once', async () => {
    loggedIn()
    const open = noShortage()   // is_followed defaults to false
    services.drug.getDrug360.mockResolvedValue(open)
    const store = useDrugStore()
    await store.loadDrug('161')
    const request = deferred()
    services.cabinet.follow.mockReturnValue(request.promise)

    const toggling = store.toggleFollow()
    expect(store.current.isFollowed).toBe(true)      // before the server answered
    expect(store.followPending).toBe(true)
    request.resolve()
    await toggling

    expect(services.cabinet.follow).toHaveBeenCalledWith('161')
    expect(store.current.isFollowed).toBe(true)
    expect(store.followPending).toBe(false)
    expect(store.followError).toBeNull()
  })

  it('unfollows a followed drug', async () => {
    loggedIn()
    const store = useDrugStore()
    await store.loadDrug('5640')      // fixture: is_followed true
    expect(store.current.isFollowed).toBe(true)

    await store.toggleFollow()

    expect(services.cabinet.unfollow).toHaveBeenCalledWith('5640')
    expect(store.current.isFollowed).toBe(false)
  })

  it('flips back, keeps the error and shows a toast when the server refuses', async () => {
    loggedIn()
    services.cabinet.unfollow.mockRejectedValue(failure(500))
    const store = useDrugStore()
    await store.loadDrug('5640')

    await store.toggleFollow()

    expect(store.current.isFollowed).toBe(true)
    expect(store.followError.status).toBe(500)
    expect(store.followPending).toBe(false)
    expect(useUiStore().toast.message).toBe('Could not unfollow ibuprofen. Try again.')
  })

  it('rolls a refused follow back to "not followed"', async () => {
    loggedIn()
    services.drug.getDrug360.mockResolvedValue(noShortage())
    services.cabinet.follow.mockRejectedValue(failure(404))
    const store = useDrugStore()
    await store.loadDrug('161')

    await store.toggleFollow()

    expect(store.current.isFollowed).toBe(false)
    expect(useUiStore().toast.message).toBe('Could not follow acetaminophen. Try again.')
  })

  it('ignores a second click while the first is still running', async () => {
    loggedIn()
    const request = deferred()
    services.cabinet.unfollow.mockReturnValue(request.promise)
    const store = useDrugStore()
    await store.loadDrug('5640')

    const first = store.toggleFollow()
    await store.toggleFollow()
    request.resolve()
    await first

    expect(services.cabinet.unfollow).toHaveBeenCalledTimes(1)
    expect(store.current.isFollowed).toBe(false)
  })

  it('refreshes the followed list afterwards so the navbar count is right', async () => {
    loggedIn()
    const store = useDrugStore()
    await store.loadDrug('5640')

    await store.toggleFollow()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(useCabinetStore().followed.map((d) => d.rxcui)).toEqual(['5640'])
  })

  it('is not undone when only the refresh of the followed list fails', async () => {
    loggedIn()
    services.cabinet.list.mockRejectedValue(failure(500))
    const store = useDrugStore()
    await store.loadDrug('5640')

    await store.toggleFollow()

    expect(store.current.isFollowed).toBe(false)
    expect(store.followError).toBeNull()
  })

  it('does not flip the next drug when a refusal arrives after navigation', async () => {
    loggedIn()
    const request = deferred()
    services.cabinet.unfollow.mockReturnValue(request.promise)
    const store = useDrugStore()
    await store.loadDrug('5640')
    const toggling = store.toggleFollow()
    services.drug.getDrug360.mockResolvedValue(noShortage())
    await store.loadDrug('161')

    request.reject(failure(500))
    await toggling

    expect(store.current.name).toBe('acetaminophen')
    expect(store.current.isFollowed).toBe(false)
  })
})
