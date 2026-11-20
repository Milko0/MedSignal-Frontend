import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { alertItem, followedDrug, followedDrugNoShortage } from '../../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useCabinetStore, FRESH_MS } = await import('@/application/stores/useCabinetStore')

setupPinia()

const ibuprofen = () => toFollowedDrug(followedDrug)                       // CURRENT, 3 packages
const acetaminophen = () => toFollowedDrug(followedDrugNoShortage)         // no record
const alert = (id, over = {}) => toAlert({ ...alertItem, alert_id: id, ...over })
const failure = (status = 500) => Object.assign(new Error('boom'), { status })
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  services.cabinet.list.mockResolvedValue([ibuprofen(), acetaminophen()])
  services.cabinet.alerts.mockResolvedValue([alert('a-1')])
  services.cabinet.follow.mockResolvedValue(undefined)
  services.cabinet.unfollow.mockResolvedValue(undefined)
  services.cabinet.dismiss.mockResolvedValue(undefined)
  services.cabinet.dismissAll.mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

describe('load', () => {
  it('reads the followed drugs and the alerts together', async () => {
    const store = useCabinetStore()

    await store.load()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
    expect(store.followed.map((d) => d.rxcui)).toEqual(['5640', '161'])
    expect(store.alerts.map((a) => a.id)).toEqual(['a-1'])
    expect(store.loaded).toBe(true)
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('starts both requests before either answers', async () => {
    const list = deferred()
    services.cabinet.list.mockReturnValue(list.promise)
    const store = useCabinetStore()

    const loading = store.load()

    expect(services.cabinet.alerts).toHaveBeenCalled()
    expect(store.loading).toBe(true)
    list.resolve([])
    await loading
  })

  it('is not loaded before the first load', () => {
    expect(useCabinetStore().loaded).toBe(false)
  })

  it('does nothing while both lists are fresh, so other pages can call it freely', async () => {
    const store = useCabinetStore()
    await store.load()

    await store.load()
    vi.setSystemTime(Date.now() + FRESH_MS - 1000)
    await store.load()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
  })

  it('reads again once the lists are older than a minute, and when forced', async () => {
    const store = useCabinetStore()
    await store.load()

    vi.setSystemTime(Date.now() + FRESH_MS + 1000)
    await store.load()
    expect(services.cabinet.list).toHaveBeenCalledTimes(2)

    await store.load({ force: true })
    expect(services.cabinet.list).toHaveBeenCalledTimes(3)
  })

  it('never throws: a failing list ends up in `error`, the other list still loads', async () => {
    services.cabinet.alerts.mockRejectedValue(failure(500))
    const store = useCabinetStore()

    await store.load()

    expect(store.error.status).toBe(500)
    expect(store.followed).toHaveLength(2)
    expect(store.alerts).toEqual([])
    expect(store.loaded).toBe(false)
    expect(store.loading).toBe(false)
  })

  it('tries again after a failure and clears the error', async () => {
    services.cabinet.list.mockRejectedValueOnce(failure(503))
    const store = useCabinetStore()
    await store.load()
    expect(store.error).not.toBeNull()

    await store.load()

    expect(store.error).toBeNull()
    expect(store.loaded).toBe(true)
  })
})

describe('shared requests', () => {
  it('two callers asking at once (navbar and dashboard) cause one request per list', async () => {
    const store = useCabinetStore()

    await Promise.all([store.load(), store.loadFollowed(), store.loadAlerts()])

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
  })

  it('loadFollowed and loadAlerts throw so the dashboard can keep its own error', async () => {
    services.cabinet.list.mockRejectedValueOnce(failure(500))
    const store = useCabinetStore()

    await expect(store.loadFollowed()).rejects.toMatchObject({ status: 500 })
    await expect(store.loadFollowed()).resolves.toBeUndefined()   // a new request after the failed one
  })

  it('an answer that arrives after a reset (logout) is dropped', async () => {
    const list = deferred()
    services.cabinet.list.mockReturnValue(list.promise)
    const store = useCabinetStore()

    const loading = store.load()
    store.reset()
    list.resolve([ibuprofen()])
    await loading

    expect(store.followed).toEqual([])
    expect(store.loaded).toBe(false)
  })
})

describe('refreshAlerts', () => {
  it('does nothing when the alerts are fresh and reads them again when they are older than a minute', async () => {
    const store = useCabinetStore()
    await store.load()
    services.cabinet.alerts.mockClear()

    await store.refreshAlerts()
    expect(services.cabinet.alerts).not.toHaveBeenCalled()

    vi.setSystemTime(Date.now() + FRESH_MS + 1000)
    services.cabinet.alerts.mockResolvedValue([alert('a-1'), alert('a-2')])
    await store.refreshAlerts()
    expect(store.alerts).toHaveLength(2)
  })

  it('reads them when nothing was ever loaded, and swallows a failure', async () => {
    services.cabinet.alerts.mockRejectedValue(failure())
    const store = useCabinetStore()

    await expect(store.refreshAlerts()).resolves.toBeUndefined()

    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
  })

  it('does not touch the followed list', async () => {
    const store = useCabinetStore()

    await store.refreshAlerts()

    expect(services.cabinet.list).not.toHaveBeenCalled()
  })
})

describe('follow', () => {
  it('follows, then refreshes the followed list so the count is right', async () => {
    services.cabinet.list.mockResolvedValue([ibuprofen()])
    const store = useCabinetStore()

    await store.follow('5640')

    expect(services.cabinet.follow).toHaveBeenCalledWith('5640')
    expect(store.followed).toHaveLength(1)
  })

  it('is not a failure when only the refresh fails', async () => {
    services.cabinet.list.mockRejectedValue(failure())
    const store = useCabinetStore()

    await expect(store.follow('5640')).resolves.toBeUndefined()
  })

  it('throws when the server refuses', async () => {
    services.cabinet.follow.mockRejectedValue(failure(404))
    const store = useCabinetStore()

    await expect(store.follow('0')).rejects.toMatchObject({ status: 404 })
  })
})

describe('unfollow', () => {
  async function withDrugs() {
    const store = useCabinetStore()
    await store.load()
    services.cabinet.list.mockClear()
    return store
  }

  it('removes the drug at once, before the server answered', async () => {
    const store = await withDrugs()
    const request = deferred()
    services.cabinet.unfollow.mockReturnValue(request.promise)
    services.cabinet.list.mockResolvedValue([acetaminophen()])

    const unfollowing = store.unfollow('5640')
    expect(store.followed.map((d) => d.rxcui)).toEqual(['161'])
    request.resolve()
    await unfollowing

    expect(services.cabinet.unfollow).toHaveBeenCalledWith('5640')
    expect(services.cabinet.list).toHaveBeenCalledOnce()
  })

  it('puts the drug back at its place and throws when the server refuses', async () => {
    const store = await withDrugs()
    services.cabinet.unfollow.mockRejectedValue(failure(500))

    await expect(store.unfollow('5640')).rejects.toMatchObject({ status: 500 })

    expect(store.followed.map((d) => d.rxcui)).toEqual(['5640', '161'])
    expect(services.cabinet.list).not.toHaveBeenCalled()
  })

  it('puts a middle drug back in the middle', async () => {
    const store = useCabinetStore()
    services.cabinet.list.mockResolvedValue([ibuprofen(), toFollowedDrug({ rxcui: '2', name: 'b' }), acetaminophen()])
    await store.load()
    services.cabinet.unfollow.mockRejectedValue(failure())

    await store.unfollow('2').catch(() => {})

    expect(store.followed.map((d) => d.rxcui)).toEqual(['5640', '2', '161'])
  })

  it('works for a drug the list does not contain (the Drug 360 page before the cabinet was loaded)', async () => {
    const store = useCabinetStore()
    services.cabinet.list.mockResolvedValue([])

    await store.unfollow('5640')

    expect(services.cabinet.unfollow).toHaveBeenCalledWith('5640')
    expect(store.followed).toEqual([])
  })

  it('a refresh that fails afterwards does not undo the unfollow', async () => {
    const store = await withDrugs()
    services.cabinet.list.mockRejectedValue(failure())

    await expect(store.unfollow('5640')).resolves.toBeUndefined()

    expect(store.followed.map((d) => d.rxcui)).toEqual(['161'])
  })

  it('an older read still on its way cannot bring the drug back', async () => {
    const store = useCabinetStore()
    const older = deferred()
    services.cabinet.list.mockReturnValueOnce(older.promise)
    const loading = store.loadFollowed()                            // started before the unfollow, answers late
    services.cabinet.list.mockResolvedValue([acetaminophen()])      // what the server says after the unfollow

    const unfollowing = store.unfollow('5640')
    older.resolve([ibuprofen(), acetaminophen()])                   // the stale answer
    await Promise.all([loading, unfollowing])

    expect(store.followed.map((d) => d.rxcui)).toEqual(['161'])
  })
})

describe('dismiss', () => {
  async function withAlerts() {
    services.cabinet.alerts.mockResolvedValue([alert('a-1'), alert('a-2'), alert('a-3')])
    const store = useCabinetStore()
    await store.load()
    return store
  }

  it('removes the alert at once and asks the server', async () => {
    const store = await withAlerts()
    const request = deferred()
    services.cabinet.dismiss.mockReturnValue(request.promise)

    const dismissing = store.dismiss('a-2')
    expect(store.alerts.map((a) => a.id)).toEqual(['a-1', 'a-3'])
    request.resolve()
    await dismissing

    expect(services.cabinet.dismiss).toHaveBeenCalledWith('a-2')
    expect(store.unreadCount).toBe(2)
  })

  it('puts the alert back at its place and throws when the server refuses', async () => {
    const store = await withAlerts()
    services.cabinet.dismiss.mockRejectedValue(failure())

    await expect(store.dismiss('a-2')).rejects.toMatchObject({ status: 500 })

    expect(store.alerts.map((a) => a.id)).toEqual(['a-1', 'a-2', 'a-3'])
  })

  it('does nothing for an alert that is not there', async () => {
    const store = await withAlerts()

    await store.dismiss('nope')

    expect(services.cabinet.dismiss).not.toHaveBeenCalled()
    expect(store.alerts).toHaveLength(3)
  })

  it('dismiss all empties the list at once and asks the server once', async () => {
    const store = await withAlerts()
    const request = deferred()
    services.cabinet.dismissAll.mockReturnValue(request.promise)

    const dismissing = store.dismissAll()
    expect(store.alerts).toEqual([])
    request.resolve()
    await dismissing

    expect(services.cabinet.dismissAll).toHaveBeenCalledOnce()
  })

  it('dismiss all brings every alert back when the server refuses', async () => {
    const store = await withAlerts()
    services.cabinet.dismissAll.mockRejectedValue(failure())

    await expect(store.dismissAll()).rejects.toMatchObject({ status: 500 })

    expect(store.alerts.map((a) => a.id)).toEqual(['a-1', 'a-2', 'a-3'])
  })

  it('dismiss all does nothing when there are no alerts', async () => {
    const store = useCabinetStore()

    await store.dismissAll()

    expect(services.cabinet.dismissAll).not.toHaveBeenCalled()
  })
})

describe('reset', () => {
  it('forgets the lists, the freshness, the error and the filter', async () => {
    const store = useCabinetStore()
    await store.load()
    store.setFilter('SIGNAL')

    store.reset()

    expect(store.followed).toEqual([])
    expect(store.alerts).toEqual([])
    expect(store.loaded).toBe(false)
    expect(store.error).toBeNull()
    expect(store.activeFilter).toBe('ALL')
    expect(store.unreadCount).toBe(0)
    expect(store.followedCount).toBe(0)
  })

  it('makes the next load read again even within a minute', async () => {
    const store = useCabinetStore()
    await store.load()

    store.reset()
    await store.load()

    expect(services.cabinet.list).toHaveBeenCalledTimes(2)
  })
})

describe('what the views show', () => {
  async function loaded() {
    services.cabinet.list.mockResolvedValue([ibuprofen(), acetaminophen(), toFollowedDrug({ rxcui: '7', name: 'warfarin' })])
    services.cabinet.alerts.mockResolvedValue([
      alert('old', { type: 'SIGNAL', drug_rxcui: '161', created_at: '2026-11-10T09:00:00Z' }),
      alert('new', { type: 'RECALL', drug_rxcui: '7', created_at: '2026-11-19T09:00:00Z' }),
    ])
    const store = useCabinetStore()
    await store.load()
    return store
  }

  it('rows: attention first with the status of the newest alert', async () => {
    const store = await loaded()

    expect(store.rows.map((r) => [r.name, r.status.label])).toEqual([
      ['warfarin', 'New recall'], ['acetaminophen', 'New signal'], ['ibuprofen', 'Currently in shortage'],
    ])
  })

  it('filteredRows follows the chip, and counts say how many each chip holds', async () => {
    const store = await loaded()

    store.setFilter('SIGNAL')
    expect(store.filteredRows.map((r) => r.name)).toEqual(['acetaminophen'])
    store.setFilter('SHORTAGE')
    expect(store.filteredRows.map((r) => r.name)).toEqual(['ibuprofen'])
    store.setFilter('ALL')
    expect(store.filteredRows).toHaveLength(3)
    expect(store.filterCounts).toEqual({ ALL: 3, SHORTAGE: 1, SIGNAL: 1, LABEL: 0, RECALL: 1 })
  })

  it('setFilter ignores a chip that does not exist', async () => {
    const store = await loaded()
    store.setFilter('SIGNAL')

    store.setFilter('BOGUS')

    expect(store.activeFilter).toBe('SIGNAL')
  })

  it('a row follows the list: an unfollowed drug leaves the rows and the counts', async () => {
    const store = await loaded()
    services.cabinet.list.mockResolvedValue([ibuprofen(), acetaminophen()])   // what the server says afterwards

    await store.unfollow('7')

    expect(store.rows.map((r) => r.rxcui)).not.toContain('7')
    expect(store.filterCounts.ALL).toBe(2)
  })

  it('namedAlerts: newest first, with the drug name, or the rxcui when the drug is not followed', async () => {
    services.cabinet.alerts.mockResolvedValue([
      alert('x', { drug_rxcui: '999', created_at: '2026-11-01T00:00:00Z' }),
      alert('y', { drug_rxcui: '5640', created_at: '2026-11-05T00:00:00Z' }),
    ])
    const store = useCabinetStore()
    await store.load()

    expect(store.namedAlerts.map((a) => [a.id, a.drugName])).toEqual([['y', 'ibuprofen'], ['x', '999']])
  })

  it('counts: unread alerts and followed drugs', async () => {
    const store = await loaded()

    expect(store.unreadCount).toBe(2)
    expect(store.followedCount).toBe(3)
  })

  it('does not reorder the alerts it holds', async () => {
    const store = await loaded()

    store.namedAlerts

    expect(store.alerts.map((a) => a.id)).toEqual(['old', 'new'])
  })
})
