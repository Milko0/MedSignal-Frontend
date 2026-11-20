import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthService } from '@/application/services/authService'

const user = { id: 'u-1f3a', username: 'p1_test_a', email: 'p1_test_a@example.com', role: 'user' }

let authApi, profileApi, token, session, auth
beforeEach(() => {
  token = null
  session = { get: vi.fn(() => token), set: vi.fn((t) => { token = t }), clear: vi.fn(() => { token = null }) }
  authApi = {
    register: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue({ accessToken: 'jwt' }),
    logout: vi.fn().mockResolvedValue(undefined),
  }
  profileApi = { get: vi.fn().mockResolvedValue(user) }
  auth = createAuthService(authApi, profileApi, session)
})

describe('authService', () => {
  it('stores the token, then loads the user from the profile', async () => {
    const u = await auth.login({ identifier: 'p1_test_a', password: 'secret123' })
    expect(authApi.login).toHaveBeenCalledWith({ identifier: 'p1_test_a', password: 'secret123' })
    expect(session.set).toHaveBeenCalledWith('jwt')
    expect(u).toEqual(user)
    expect(auth.hasToken()).toBe(true)
  })

  it('drops the token when the profile cannot be loaded', async () => {
    profileApi.get.mockRejectedValue(new Error('boom'))
    await expect(auth.login({ identifier: 'x', password: 'y' })).rejects.toThrow('boom')
    expect(session.clear).toHaveBeenCalled()
    expect(auth.hasToken()).toBe(false)
  })

  it('does not store a token when login fails', async () => {
    authApi.login.mockRejectedValue(new Error('Invalid credentials'))
    await expect(auth.login({ identifier: 'x', password: 'y' })).rejects.toThrow('Invalid credentials')
    expect(session.set).not.toHaveBeenCalled()
  })

  it('registers, then logs in with the username and the same password', async () => {
    const u = await auth.register({ username: 'p1_test_a', email: 'p1_test_a@example.com', password: 'secret123' })
    expect(authApi.register).toHaveBeenCalledWith({ username: 'p1_test_a', email: 'p1_test_a@example.com', password: 'secret123' })
    expect(authApi.login).toHaveBeenCalledWith({ identifier: 'p1_test_a', password: 'secret123' })
    expect(u).toEqual(user)
  })

  it('does not log in when registration fails', async () => {
    authApi.register.mockRejectedValue(new Error('Username taken'))
    await expect(auth.register({ username: 'a', email: 'b', password: 'c' })).rejects.toThrow('Username taken')
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('revokes the token on the server and clears the session on logout', async () => {
    token = 'jwt'
    await auth.logout()
    expect(authApi.logout).toHaveBeenCalledOnce()
    expect(session.clear).toHaveBeenCalled()
    expect(auth.hasToken()).toBe(false)
  })

  it('still clears the session when the revoke call fails', async () => {
    token = 'jwt'
    authApi.logout.mockRejectedValue(new Error('401'))
    await expect(auth.logout()).resolves.toBeUndefined()
    expect(auth.hasToken()).toBe(false)
  })

  it('skips the server call when there is no token', async () => {
    await auth.logout()
    expect(authApi.logout).not.toHaveBeenCalled()
  })
})
