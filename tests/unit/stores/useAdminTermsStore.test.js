import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAdminTermsStore } = await import('@/application/stores/useAdminTermsStore')
const { useAdminUsersStore } = await import('@/application/stores/useAdminCrudStore')
const { resetAdminStores } = await import('@/application/stores/useAdminStores')

setupPinia()

const failure = (message = 'boom') => Object.assign(new Error(message), { status: 500 })
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => { vi.resetAllMocks() })

describe('useAdminTermsStore', () => {
  it('loads the list', async () => {
    services.admin.terms.list.mockResolvedValue(['death', 'drug ineffective'])
    const store = useAdminTermsStore()
    await store.load()
    expect(store.items).toEqual(['death', 'drug ineffective'])
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })

  it('keeps the old list and reports the error when a reload fails, then recovers', async () => {
    services.admin.terms.list.mockResolvedValueOnce(['death']).mockRejectedValueOnce(failure('Server error')).mockResolvedValueOnce(['death', 'pain'])
    const store = useAdminTermsStore()
    await store.load()
    await store.load()
    expect(store.error).toBe('Server error')
    expect(store.items).toEqual(['death'])
    await store.load()
    expect(store.error).toBe('')
    expect(store.items).toEqual(['death', 'pain'])
  })

  it('add returns the term as stored (normalised) and reloads the list', async () => {
    services.admin.terms.list.mockResolvedValue(['headache'])
    services.admin.terms.add.mockResolvedValue('headache')
    const store = useAdminTermsStore()
    expect(await store.add('  Headache ')).toBe('headache')
    expect(services.admin.terms.add).toHaveBeenCalledWith('  Headache ')
    expect(store.items).toEqual(['headache'])
  })

  it('remove deletes and reloads; a refusal is rethrown without a reload', async () => {
    services.admin.terms.list.mockResolvedValue([])
    services.admin.terms.remove.mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure('Term not found'))
    const store = useAdminTermsStore()
    await store.remove('death')
    expect(services.admin.terms.remove).toHaveBeenCalledWith('death')
    expect(services.admin.terms.list).toHaveBeenCalledTimes(1)
    await expect(store.remove('gone')).rejects.toThrow('Term not found')
    expect(services.admin.terms.list).toHaveBeenCalledTimes(1)
  })

  it('drops the answer of an overtaken load', async () => {
    const slow = deferred()
    services.admin.terms.list.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(['new'])
    const store = useAdminTermsStore()
    const first = store.load()
    await store.load()
    slow.resolve(['old'])
    await first
    expect(store.items).toEqual(['new'])
  })
})

describe('resetAdminStores', () => {
  it('empties the terms and every admin list, and ignores an answer still on its way', async () => {
    const slow = deferred()
    services.admin.terms.list.mockReturnValueOnce(slow.promise)
    services.admin.users.list.mockResolvedValue([{ id: 'u1' }])
    const terms = useAdminTermsStore()
    const users = useAdminUsersStore()
    await users.load(1)
    const pending = terms.load()
    resetAdminStores()
    slow.resolve(['late'])
    await pending
    expect(terms.items).toEqual([])
    expect(terms.loaded).toBe(false)
    expect(users.items).toEqual([])
  })
})
