import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useDrugStore } = await import('@/application/stores/useDrugStore')

setupPinia()
beforeEach(() => vi.resetAllMocks())

// A promise the test settles by hand, to control the order in which responses arrive.
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const ibuprofen = { rxcui: '5640', name: 'ibuprofen', brandNames: ['Advil'], matched: 'ibuprofen', score: 0.9 }
const ibandronate = { rxcui: '29', name: 'ibandronate', brandNames: [], matched: 'ibandronate', score: 0.5 }

describe('useDrugStore search', () => {
  it('asks the service with the trimmed query and a limit, and keeps the results', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const store = useDrugStore()

    await store.search('  ibuprofn ')

    expect(services.drug.search).toHaveBeenCalledWith('ibuprofn', 10)
    expect(store.results).toEqual([ibuprofen])
    expect(store.searchQuery).toBe('ibuprofn')
    expect(store.searching).toBe(false)
    expect(store.searchError).toBeNull()
  })

  it('does not call the service below 2 characters and clears the old results', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const store = useDrugStore()
    await store.search('ibu')

    await store.search('i')
    await store.search(' ')
    await store.search(undefined)

    expect(services.drug.search).toHaveBeenCalledTimes(1)
    expect(store.results).toEqual([])
    expect(store.searchQuery).toBe('')
  })

  it('ignores a stale response that arrives after a newer one', async () => {
    const slow = deferred()
    const fast = deferred()
    services.drug.search.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
    const store = useDrugStore()

    const first = store.search('ibu')
    const second = store.search('ibuprofn')
    fast.resolve([ibuprofen])
    await second
    slow.resolve([ibandronate])
    await first

    expect(store.results).toEqual([ibuprofen])
    expect(store.searchQuery).toBe('ibuprofn')
    expect(store.searching).toBe(false)
  })

  it('drops an answer that arrives after the box was cleared', async () => {
    const pending = deferred()
    services.drug.search.mockReturnValue(pending.promise)
    const store = useDrugStore()

    const running = store.search('ibu')
    await store.search('')
    pending.resolve([ibuprofen])
    await running

    expect(store.results).toEqual([])
    expect(store.searching).toBe(false)
  })

  it('is searching while the request runs', async () => {
    const pending = deferred()
    services.drug.search.mockReturnValue(pending.promise)
    const store = useDrugStore()

    const running = store.search('ibu')
    expect(store.searching).toBe(true)
    pending.resolve([])
    await running

    expect(store.searching).toBe(false)
  })

  it('keeps the error, empties the results and stops searching when the request fails', async () => {
    services.drug.search.mockResolvedValueOnce([ibuprofen])
    const store = useDrugStore()
    await store.search('ibu')
    const failure = Object.assign(new Error('Network Error'), { status: 0 })
    services.drug.search.mockRejectedValueOnce(failure)

    await store.search('ibuprofn')

    expect(store.searchError).toBe(failure)
    expect(store.results).toEqual([])
    expect(store.searching).toBe(false)
  })

  it('clears the error on the next search', async () => {
    services.drug.search.mockRejectedValueOnce(new Error('down'))
    services.drug.search.mockResolvedValueOnce([ibuprofen])
    const store = useDrugStore()
    await store.search('ibu')

    await store.search('ibup')

    expect(store.searchError).toBeNull()
    expect(store.results).toEqual([ibuprofen])
  })

  it('ignores the error of a stale request', async () => {
    const slow = deferred()
    services.drug.search.mockReturnValueOnce(slow.promise).mockResolvedValueOnce([ibuprofen])
    const store = useDrugStore()

    const first = store.search('ibu')
    await store.search('ibuprofn')
    slow.reject(new Error('timeout'))
    await first

    expect(store.searchError).toBeNull()
    expect(store.results).toEqual([ibuprofen])
  })
})
