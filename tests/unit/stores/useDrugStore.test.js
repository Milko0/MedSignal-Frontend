import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'
import { toDrug360 } from '@/infrastructure/mappers/drugMapper'
import { alternativesData, drug360, drug360NoShortage } from '../../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useDrugStore } = await import('@/application/stores/useDrugStore')

setupPinia()
beforeEach(() => vi.resetAllMocks())

describe('useDrugStore', () => {
  it('loads Drug 360 and the alternatives when the drug is in shortage', async () => {
    services.drug.getDrug360.mockResolvedValue(toDrug360(drug360))
    services.drug.getAlternatives.mockResolvedValue(toAlternatives(alternativesData))
    const store = useDrugStore()

    await store.fetchDrug360('5640')

    expect(services.drug.getDrug360).toHaveBeenCalledWith('5640')
    expect(services.drug.getAlternatives).toHaveBeenCalledWith('5640')
    expect(store.current.name).toBe('ibuprofen')
    expect(store.alternatives.items).toHaveLength(2)
    expect(store.error).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('does not ask for alternatives when there is no shortage record', async () => {
    services.drug.getDrug360.mockResolvedValue(toDrug360(drug360NoShortage))
    const store = useDrugStore()

    await store.fetchDrug360('161')

    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    expect(store.alternatives).toBeNull()
  })

  it('clears the alternatives of the previous drug', async () => {
    services.drug.getDrug360.mockResolvedValueOnce(toDrug360(drug360))
    services.drug.getAlternatives.mockResolvedValue(toAlternatives(alternativesData))
    services.drug.getDrug360.mockResolvedValueOnce(toDrug360(drug360NoShortage))
    const store = useDrugStore()

    await store.fetchDrug360('5640')
    await store.fetchDrug360('161')

    expect(store.alternatives).toBeNull()
  })

  it('keeps the error and stops loading when the request fails', async () => {
    const failure = Object.assign(new Error('Drug not found'), { status: 404 })
    services.drug.getDrug360.mockRejectedValue(failure)
    const store = useDrugStore()

    await store.fetchDrug360('0')

    expect(store.error.status).toBe(404)
    expect(store.loading).toBe(false)
  })

  it('stores the search results', async () => {
    services.drug.search.mockResolvedValue([{ rxcui: '5640', name: 'ibuprofen' }])
    const store = useDrugStore()

    await store.search('ibuprofn')

    expect(store.results).toEqual([{ rxcui: '5640', name: 'ibuprofen' }])
  })
})
