import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAdminUsersStore, useAdminReportsStore, useAdminShortagesStore, resetAdminCrudStores } =
  await import('@/application/stores/useAdminCrudStore')
const { ADMIN_PAGE_SIZE } = await import('@/core/constants/admin')

setupPinia()

const users = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `u-${from + i}`, username: `user${from + i}`, email: `u${from + i}@example.com`, role: 'user' }))
const failure = (message = 'boom') => Object.assign(new Error(message), { status: 500 })
function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

beforeEach(() => { vi.resetAllMocks() })

describe('load and paging', () => {
  it('reads page 1 with the admin page size', async () => {
    services.admin.users.list.mockResolvedValue(users(3))
    const store = useAdminUsersStore()
    await store.load(1)
    expect(services.admin.users.list).toHaveBeenCalledWith({ page: 1, pageSize: ADMIN_PAGE_SIZE })
    expect(store.items).toHaveLength(3)
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })

  it('offers Next only after a full page, and never Previous on page 1', async () => {
    services.admin.users.list.mockResolvedValue(users(ADMIN_PAGE_SIZE))
    const store = useAdminUsersStore()
    await store.load(1)
    expect(store.hasNext).toBe(true)
    expect(store.hasPrev).toBe(false)
    services.admin.users.list.mockResolvedValue(users(4))
    await store.next()
    expect(store.page).toBe(2)
    expect(store.hasNext).toBe(false)
    expect(store.hasPrev).toBe(true)
  })

  it('next does nothing on the last page, prev does nothing on the first', async () => {
    services.admin.users.list.mockResolvedValue(users(2))
    const store = useAdminUsersStore()
    await store.load(1)
    services.admin.users.list.mockClear()
    await store.next()
    await store.prev()
    expect(services.admin.users.list).not.toHaveBeenCalled()
    expect(store.page).toBe(1)
  })

  it('keeps the old rows and the old page when a page fails, and says why', async () => {
    services.admin.users.list.mockResolvedValueOnce(users(ADMIN_PAGE_SIZE)).mockRejectedValueOnce(failure('Server error'))
    const store = useAdminUsersStore()
    await store.load(1)
    await store.next()
    expect(store.error).toBe('Server error')
    expect(store.page).toBe(1)
    expect(store.items).toHaveLength(ADMIN_PAGE_SIZE)
    expect(store.loading).toBe(false)
  })

  it('clears the error on a successful retry', async () => {
    services.admin.users.list.mockRejectedValueOnce(failure()).mockResolvedValueOnce(users(1))
    const store = useAdminUsersStore()
    await store.load(1)
    expect(store.error).toBeTruthy()
    await store.load(1)
    expect(store.error).toBe('')
    expect(store.items).toHaveLength(1)
  })

  it('drops the answer of an overtaken request', async () => {
    const slow = deferred()
    services.admin.users.list.mockReturnValueOnce(slow.promise).mockResolvedValueOnce(users(1, 100))
    const store = useAdminUsersStore()
    const first = store.load(1)
    await store.load(1)
    slow.resolve(users(5))
    await first
    expect(store.items.map((u) => u.id)).toEqual(['u-100'])
  })
})

describe('create, update, remove', () => {
  it('create sends the body, reloads the current page and returns the saved record', async () => {
    services.admin.users.list.mockResolvedValue(users(1))
    services.admin.users.create.mockResolvedValue({ id: 'u-new' })
    const store = useAdminUsersStore()
    await store.load(1)
    const saved = await store.create({ username: 'luca' })
    expect(services.admin.users.create).toHaveBeenCalledWith({ username: 'luca' })
    expect(saved).toEqual({ id: 'u-new' })
    expect(services.admin.users.list).toHaveBeenCalledTimes(2)
  })

  it('update goes to the id and reloads', async () => {
    services.admin.users.list.mockResolvedValue(users(1))
    services.admin.users.update.mockResolvedValue({ id: 'u-0', role: 'admin' })
    const store = useAdminUsersStore()
    await store.load(1)
    await store.update('u-0', { role: 'admin' })
    expect(services.admin.users.update).toHaveBeenCalledWith('u-0', { role: 'admin' })
    expect(services.admin.users.list).toHaveBeenCalledTimes(2)
  })

  it('rethrows a refused save (409, 422) and does not reload', async () => {
    services.admin.users.list.mockResolvedValue(users(1))
    services.admin.users.update.mockRejectedValue(failure('This is the last administrator'))
    const store = useAdminUsersStore()
    await store.load(1)
    await expect(store.update('u-0', { role: 'user' })).rejects.toThrow('last administrator')
    expect(services.admin.users.list).toHaveBeenCalledTimes(1)
  })

  it('remove uses each resource\'s own id field', async () => {
    services.admin.reports.list.mockResolvedValue([{ report_id: 'R1' }])
    services.admin.reports.remove.mockResolvedValue(undefined)
    services.admin.shortages.list.mockResolvedValue([{ package_ndc: '1111-2222-33' }])
    services.admin.shortages.remove.mockResolvedValue(undefined)
    const reports = useAdminReportsStore()
    const shortages = useAdminShortagesStore()
    await reports.load(1)
    await shortages.load(1)
    await reports.remove({ report_id: 'R1' })
    await shortages.remove({ package_ndc: '1111-2222-33' })
    expect(services.admin.reports.remove).toHaveBeenCalledWith('R1')
    expect(services.admin.shortages.remove).toHaveBeenCalledWith('1111-2222-33')
  })

  it('steps back a page when deleting the last row of a later page', async () => {
    services.admin.users.list
      .mockResolvedValueOnce(users(ADMIN_PAGE_SIZE))      // page 1
      .mockResolvedValueOnce(users(1, 100))               // page 2
      .mockResolvedValueOnce([])                          // page 2 again, now empty
      .mockResolvedValueOnce(users(ADMIN_PAGE_SIZE))      // page 1 again
    services.admin.users.remove.mockResolvedValue(undefined)
    const store = useAdminUsersStore()
    await store.load(1)
    await store.next()
    await store.remove({ id: 'u-100' })
    expect(store.page).toBe(1)
    expect(store.items).toHaveLength(ADMIN_PAGE_SIZE)
  })

  it('rethrows a refused delete', async () => {
    services.admin.users.list.mockResolvedValue(users(1))
    services.admin.users.remove.mockRejectedValue(failure('This is the last administrator'))
    const store = useAdminUsersStore()
    await store.load(1)
    await expect(store.remove({ id: 'u-0' })).rejects.toThrow('last administrator')
  })

  it('fetchOne reads a single record (used by "open by id" and before editing)', async () => {
    services.admin.reports.get.mockResolvedValue({ report_id: 'R9' })
    expect(await useAdminReportsStore().fetchOne('R9')).toEqual({ report_id: 'R9' })
    expect(services.admin.reports.get).toHaveBeenCalledWith('R9')
  })
})

describe('reset', () => {
  it('empties every admin list and ignores an answer still on its way', async () => {
    const slow = deferred()
    services.admin.users.list.mockReturnValueOnce(slow.promise)
    const store = useAdminUsersStore()
    const pending = store.load(1)
    resetAdminCrudStores()
    slow.resolve(users(3))
    await pending
    expect(store.items).toEqual([])
    expect(store.loaded).toBe(false)
    expect(store.page).toBe(1)
  })
})
