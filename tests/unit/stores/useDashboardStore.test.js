import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { alertItem, DISCLAIMER_TEXT, followedDrug, followedDrugNoShortage, signalList } from '../../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useDashboardStore } = await import('@/application/stores/useDashboardStore')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')

setupPinia()
beforeEach(() => vi.resetAllMocks())

const emergingList = { ...toSignalList({ ...signalList, total: 7 }), disclaimer: DISCLAIMER_TEXT }
const followed = [toFollowedDrug(followedDrug), toFollowedDrug(followedDrugNoShortage)]
const alertAt = (id, createdAt, rxcui = '5640') => toAlert({ ...alertItem, alert_id: id, drug_rxcui: rxcui, created_at: createdAt })

function respondWith({ loggedIn, alerts = [alertAt('a-1', '2026-11-18T09:30:00Z')] }) {
  services.auth.hasToken.mockReturnValue(loggedIn)
  services.signal.emerging.mockResolvedValue(emergingList)
  services.cabinet.list.mockResolvedValue(followed)
  services.cabinet.alerts.mockResolvedValue(alerts)
}

describe('useDashboardStore load', () => {
  it('loads only the emerging signals for a guest', async () => {
    respondWith({ loggedIn: false })
    const store = useDashboardStore()

    await store.load()

    expect(services.signal.emerging).toHaveBeenCalledOnce()
    expect(services.cabinet.list).not.toHaveBeenCalled()
    expect(services.cabinet.alerts).not.toHaveBeenCalled()
    expect(store.emerging.quarter).toBe('2026Q3')
  })

  it('asks for 5 emerging rows with at least 10 reports and no quarter (the backend picks the latest)', async () => {
    respondWith({ loggedIn: false })
    const store = useDashboardStore()

    await store.load()

    expect(services.signal.emerging).toHaveBeenCalledWith({ pageSize: 5, minReports: 10 })
  })

  it('loads the emerging signals, the followed drugs and the alerts for a user', async () => {
    respondWith({ loggedIn: true })
    const store = useDashboardStore()

    await store.load()

    expect(services.signal.emerging).toHaveBeenCalledOnce()
    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
    expect(store.emergingError).toBeNull()
    expect(store.followedError).toBeNull()
    expect(store.alertsError).toBeNull()
  })

  it('starts the three requests together, not one after the other', async () => {
    respondWith({ loggedIn: true })
    const store = useDashboardStore()

    const loading = store.load()

    expect(services.signal.emerging).toHaveBeenCalled()
    expect(services.cabinet.list).toHaveBeenCalled()
    expect(services.cabinet.alerts).toHaveBeenCalled()
    await loading
  })

  it('is loading while a request runs and not afterwards', async () => {
    respondWith({ loggedIn: true })
    const store = useDashboardStore()

    const loading = store.load()
    expect(store.emergingLoading).toBe(true)
    expect(store.followedLoading).toBe(true)
    expect(store.alertsLoading).toBe(true)
    await loading

    expect(store.emergingLoading).toBe(false)
    expect(store.followedLoading).toBe(false)
    expect(store.alertsLoading).toBe(false)
  })

  describe('when one request fails', () => {
    const failure = Object.assign(new Error('Network Error'), { status: 0 })

    it('keeps the cabinet cards when the emerging signals fail', async () => {
      respondWith({ loggedIn: true })
      services.signal.emerging.mockRejectedValue(failure)
      const store = useDashboardStore()

      await store.load()

      expect(store.emergingError).toBe(failure)
      expect(store.emerging).toBeNull()
      expect(store.followedCount).toBe(2)
      expect(store.alertCount).toBe(1)
      expect(store.followedError).toBeNull()
      expect(store.alertsError).toBeNull()
    })

    it('keeps the emerging signals and the followed drugs when the alerts fail', async () => {
      respondWith({ loggedIn: true })
      services.cabinet.alerts.mockRejectedValue(failure)
      const store = useDashboardStore()

      await store.load()

      expect(store.alertsError).toBe(failure)
      expect(store.emergingCount).toBe(7)
      expect(store.followedCount).toBe(2)
      expect(store.inShortageCount).toBe(1)
      expect(store.alertCount).toBeNull()
    })

    it('keeps the emerging signals and the alerts when the followed drugs fail', async () => {
      respondWith({ loggedIn: true })
      services.cabinet.list.mockRejectedValue(failure)
      const store = useDashboardStore()

      await store.load()

      expect(store.followedError).toBe(failure)
      expect(store.emergingCount).toBe(7)
      expect(store.alertCount).toBe(1)
      expect(store.followedCount).toBeNull()
      expect(store.inShortageCount).toBeNull()
    })

    it('loads the part again on retry and clears its error', async () => {
      respondWith({ loggedIn: true })
      services.signal.emerging.mockRejectedValueOnce(failure)
      const store = useDashboardStore()
      await store.load()

      await store.loadEmerging()

      expect(store.emergingError).toBeNull()
      expect(store.emergingCount).toBe(7)
    })

    it('keeps the data of an earlier load when a reload fails', async () => {
      respondWith({ loggedIn: true })
      const store = useDashboardStore()
      await store.load()
      services.cabinet.alerts.mockRejectedValue(failure)

      await store.loadAlerts()

      expect(store.alertsError).toBe(failure)
      expect(store.alertCount).toBe(1)
    })
  })

  describe('tiles', () => {
    it('count followed drugs, alerts, followed drugs in shortage and emerging signals', async () => {
      respondWith({ loggedIn: true, alerts: [alertAt('a-1', '2026-11-18T09:30:00Z'), alertAt('a-2', '2026-11-19T09:30:00Z')] })
      const store = useDashboardStore()

      await store.load()

      expect(store.followedCount).toBe(2)
      expect(store.alertCount).toBe(2)
      expect(store.inShortageCount).toBe(1)   // ibuprofen CURRENT; acetaminophen has no record
      expect(store.emergingCount).toBe(7)     // the backend total, not the 1 row on the page
    })

    it('count a drug whose shortage is to be discontinued, not one that is resolved', async () => {
      respondWith({ loggedIn: true })
      services.cabinet.list.mockResolvedValue([
        toFollowedDrug({ rxcui: '1', name: 'a', shortage_status: 'TO_BE_DISCONTINUED' }),
        toFollowedDrug({ rxcui: '2', name: 'b', shortage_status: 'RESOLVED' }),
        toFollowedDrug({ rxcui: '3', name: 'c', shortage_status: 'CURRENT' }),
      ])
      const store = useDashboardStore()

      await store.load()

      expect(store.inShortageCount).toBe(2)
    })

    it('are 0 for a user with nothing yet (not null: the load worked)', async () => {
      respondWith({ loggedIn: true, alerts: [] })
      services.cabinet.list.mockResolvedValue([])
      const store = useDashboardStore()

      await store.load()

      expect(store.followedCount).toBe(0)
      expect(store.alertCount).toBe(0)
      expect(store.inShortageCount).toBe(0)
    })

    it('are null before anything loaded', () => {
      services.auth.hasToken.mockReturnValue(false)
      const store = useDashboardStore()

      expect(store.emergingCount).toBeNull()
    })
  })

  describe('latest alerts', () => {
    it('are the newest 4, newest first', async () => {
      const alerts = [
        alertAt('a-1', '2026-11-14T10:00:00Z'), alertAt('a-2', '2026-11-19T10:00:00Z'), alertAt('a-3', '2026-11-16T10:00:00Z'),
        alertAt('a-4', '2026-11-20T08:00:00Z'), alertAt('a-5', '2026-11-18T10:00:00Z'),
      ]
      respondWith({ loggedIn: true, alerts })
      const store = useDashboardStore()

      await store.load()

      expect(store.latestAlerts.map((a) => a.id)).toEqual(['a-4', 'a-2', 'a-5', 'a-3'])
    })

    it('take the drug name from the followed drugs and fall back to the rxcui', async () => {
      respondWith({ loggedIn: true, alerts: [alertAt('a-1', '2026-11-19T10:00:00Z', '5640'), alertAt('a-2', '2026-11-18T10:00:00Z', '999')] })
      const store = useDashboardStore()

      await store.load()

      expect(store.latestAlerts.map((a) => a.drugName)).toEqual(['ibuprofen', '999'])
    })

    it('do not change the order of the cabinet alerts', async () => {
      respondWith({ loggedIn: true, alerts: [alertAt('a-1', '2026-11-14T10:00:00Z'), alertAt('a-2', '2026-11-19T10:00:00Z')] })
      const store = useDashboardStore()

      await store.load()
      store.latestAlerts

      expect(useCabinetStore().alerts.map((a) => a.id)).toEqual(['a-1', 'a-2'])
    })
  })
})
