import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')

const user = { id: 'u-1', username: 'p2_test_user', email: 'p2_test_user@example.com', role: 'user' }

// hasToken follows a fake token so the store can re-read it after each action
let token
setupPinia()
beforeEach(() => {
  vi.resetAllMocks()
  token = null
  services.auth.hasToken.mockImplementation(() => !!token)
})

describe('useAuthStore', () => {
  it('starts logged out without a token', () => {
    const auth = useAuthStore()
    expect(auth.loggedIn).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('starts logged in when a token is already stored', () => {
    token = 'jwt'
    expect(useAuthStore().loggedIn).toBe(true)
  })

  it('login stores the user and turns loggedIn on', async () => {
    services.auth.login.mockImplementation(async () => { token = 'jwt'; return user })
    const auth = useAuthStore()

    await auth.login({ identifier: 'p2_test_user', password: 'secret123' })

    expect(services.auth.login).toHaveBeenCalledWith({ identifier: 'p2_test_user', password: 'secret123' })
    expect(auth.user).toEqual(user)
    expect(auth.loggedIn).toBe(true)
    expect(auth.initials).toBe('P2')
  })

  it('a failed login rethrows the error and stays logged out', async () => {
    const failure = Object.assign(new Error('Invalid credentials'), { status: 401 })
    services.auth.login.mockRejectedValue(failure)
    const auth = useAuthStore()

    await expect(auth.login({ identifier: 'x', password: 'y' })).rejects.toBe(failure)

    expect(auth.loggedIn).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('register creates the account, logs in and keeps the user', async () => {
    services.auth.register.mockImplementation(async () => { token = 'jwt'; return user })
    const auth = useAuthStore()

    await auth.register({ username: 'p2_test_user', email: 'p2_test_user@example.com', password: 'secret123' })

    expect(auth.user).toEqual(user)
    expect(auth.loggedIn).toBe(true)
  })

  it('a failed register (409) stays logged out', async () => {
    services.auth.register.mockRejectedValue(Object.assign(new Error('Username or email already registered'), { status: 409 }))
    const auth = useAuthStore()

    await expect(auth.register({ username: 'a', email: 'a@b.co', password: 'secret123' })).rejects.toThrow(/already registered/)

    expect(auth.loggedIn).toBe(false)
  })

  it('restore loads the user for a valid stored token', async () => {
    token = 'jwt'
    services.auth.restore.mockResolvedValue(user)
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.user).toEqual(user)
    expect(auth.loggedIn).toBe(true)
  })

  it('restore does nothing without a stored token', async () => {
    const auth = useAuthStore()
    await auth.restore()
    expect(services.auth.restore).not.toHaveBeenCalled()
    expect(auth.user).toBeNull()
  })

  it('restore falls back to guest when the token is rejected', async () => {
    token = 'garbage'
    services.auth.restore.mockImplementation(async () => { token = null; return null })
    const auth = useAuthStore()

    await auth.restore()

    expect(auth.user).toBeNull()
    expect(auth.loggedIn).toBe(false)
  })

  it('restore keeps the token when the server is unreachable', async () => {
    token = 'jwt'
    services.auth.restore.mockRejectedValue(Object.assign(new Error('offline'), { status: 0 }))
    const auth = useAuthStore()

    await expect(auth.restore()).resolves.toBeUndefined()

    expect(auth.loggedIn).toBe(true)
  })

  it('logout clears the user and the cabinet even if the server call throws', async () => {
    token = 'jwt'
    services.auth.logout.mockImplementation(async () => { token = null; throw new Error('boom') })
    const auth = useAuthStore()
    auth.user = user
    const cabinet = useCabinetStore()
    cabinet.followed = [{ rxcui: '5640' }]
    cabinet.alerts = [{ id: 'a1' }]

    await expect(auth.logout()).rejects.toThrow('boom')

    expect(auth.user).toBeNull()
    expect(auth.loggedIn).toBe(false)
    expect(cabinet.followed).toEqual([])
    expect(cabinet.alerts).toEqual([])
  })

  describe('handleUnauthorized', () => {
    const expired = { status: 401, url: '/profile' }

    it('drops the session, clears the user and resets the cabinet', () => {
      token = 'jwt'
      services.auth.clearSession.mockImplementation(() => { token = null })
      const auth = useAuthStore()
      auth.user = user
      const cabinet = useCabinetStore()
      cabinet.followed = [{ rxcui: '5640' }]

      expect(auth.handleUnauthorized(expired)).toBe(true)

      expect(services.auth.clearSession).toHaveBeenCalledOnce()
      expect(auth.user).toBeNull()
      expect(auth.loggedIn).toBe(false)
      expect(cabinet.followed).toEqual([])
    })

    it('ignores a 401 from the login request (wrong password, not an expired session)', () => {
      token = 'jwt'
      const auth = useAuthStore()
      auth.user = user

      expect(auth.handleUnauthorized({ status: 401, url: '/auth/login' })).toBe(false)

      expect(services.auth.clearSession).not.toHaveBeenCalled()
      expect(auth.user).toEqual(user)
    })

    it('ignores a 401 from the logout request', () => {
      token = 'jwt'
      expect(useAuthStore().handleUnauthorized({ status: 401, url: '/auth/logout' })).toBe(false)
      expect(services.auth.clearSession).not.toHaveBeenCalled()
    })

    it('does nothing for a guest', () => {
      expect(useAuthStore().handleUnauthorized(expired)).toBe(false)
      expect(services.auth.clearSession).not.toHaveBeenCalled()
    })
  })

  it('logout revokes the token and resets the session', async () => {
    token = 'jwt'
    services.auth.logout.mockImplementation(async () => { token = null })
    const auth = useAuthStore()
    auth.user = user

    await auth.logout()

    expect(services.auth.logout).toHaveBeenCalledOnce()
    expect(auth.user).toBeNull()
    expect(auth.loggedIn).toBe(false)
  })
})
