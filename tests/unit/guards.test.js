import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { installGuards } = await import('@/presentation/router/guards')
const { useAuthStore } = await import('@/application/stores/useAuthStore')

// installGuards only needs router.beforeEach, so capture the guard instead of building a router.
function guard() {
  let fn
  installGuards({ beforeEach: (f) => { fn = f } })
  return fn
}

setupPinia()
beforeEach(() => vi.resetAllMocks())

describe('router guards', () => {
  it('sends a guest to /login and remembers the page they wanted', () => {
    services.auth.hasToken.mockReturnValue(false)
    const to = { meta: { requiresAuth: true }, fullPath: '/my-medicines' }
    expect(guard()(to)).toEqual({ name: 'login', query: { redirect: '/my-medicines' } })
  })

  it('keeps the query string in the remembered page', () => {
    services.auth.hasToken.mockReturnValue(false)
    const to = { meta: { requiresAuth: true }, fullPath: '/profile?tab=alerts' }
    expect(guard()(to).query.redirect).toBe('/profile?tab=alerts')
  })

  it('lets a logged-in user into a protected page', () => {
    services.auth.hasToken.mockReturnValue(true)
    expect(guard()({ meta: { requiresAuth: true }, fullPath: '/profile' })).toBeUndefined()
  })

  it('sends a logged-in user away from /login to the dashboard', () => {
    services.auth.hasToken.mockReturnValue(true)
    expect(guard()({ meta: { guestOnly: true }, fullPath: '/login' })).toEqual({ name: 'dashboard' })
  })

  it('lets a guest open /login and public pages', () => {
    services.auth.hasToken.mockReturnValue(false)
    expect(guard()({ meta: { guestOnly: true }, fullPath: '/login' })).toBeUndefined()
    expect(guard()({ meta: {}, fullPath: '/signals' })).toBeUndefined()
  })

  describe('admin pages', () => {
    const adminPage = { meta: { requiresAuth: true, requiresAdmin: true }, fullPath: '/admin/users' }

    it('sends a guest to /login, not to the dashboard', () => {
      services.auth.hasToken.mockReturnValue(false)
      expect(guard()(adminPage)).toEqual({ name: 'login', query: { redirect: '/admin/users' } })
    })

    it('sends a logged-in user who is not an admin to the dashboard', () => {
      services.auth.hasToken.mockReturnValue(true)
      useAuthStore().user = { id: 'u-1', username: 'someone', role: 'user' }
      expect(guard()(adminPage)).toEqual({ name: 'dashboard' })
    })

    it('lets an admin in', () => {
      services.auth.hasToken.mockReturnValue(true)
      useAuthStore().user = { id: 'u-2', username: 'boss', role: 'admin' }
      expect(guard()(adminPage)).toBeUndefined()
    })
  })
})
