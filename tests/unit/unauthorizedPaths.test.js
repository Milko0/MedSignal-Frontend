import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../helpers/setupPinia'
import { FORM_401_PATHS } from '@/core/constants/auth'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')

let token
setupPinia()
beforeEach(() => {
  vi.resetAllMocks()
  token = 'jwt'
  services.auth.hasToken.mockImplementation(() => !!token)
  services.auth.clearSession.mockImplementation(() => { token = null })
})

const unauthorized = (url) => ({ status: 401, url })

describe('which 401s end the session', () => {
  it('lists exactly the form requests in one constant', () => {
    expect(FORM_401_PATHS).toEqual(['/auth/login', '/auth/logout', '/profile/password'])
  })

  it.each(FORM_401_PATHS)('a 401 from %s does not log the user out', (path) => {
    const auth = useAuthStore()
    auth.setUser({ id: 'u', username: 'p7_test_user' })

    expect(auth.handleUnauthorized(unauthorized(path))).toBe(false)

    expect(auth.loggedIn).toBe(true)
    expect(auth.user).not.toBeNull()
    expect(services.auth.clearSession).not.toHaveBeenCalled()
  })

  it.each(['/profile', '/profile/alert-settings', '/cabinet', '/signals', '/auth/refresh'])('a 401 from %s ends the session', (path) => {
    const auth = useAuthStore()
    auth.setUser({ id: 'u', username: 'p7_test_user' })

    expect(auth.handleUnauthorized(unauthorized(path))).toBe(true)

    expect(auth.loggedIn).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('a guest has no session to end, whatever the path', () => {
    token = null
    const auth = useAuthStore()
    expect(auth.handleUnauthorized(unauthorized('/cabinet'))).toBe(false)
  })

  it('an error without a url ends the session', () => {
    const auth = useAuthStore()
    expect(auth.handleUnauthorized({ status: 401 })).toBe(true)
  })
})
