import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupPinia } from '../../helpers/setupPinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const { useProfileStore } = await import('@/application/stores/useProfileStore')

const user = { id: 'u-1', username: 'p7_test_user', email: 'p7_test_user@example.com', role: 'user' }
const settings = { newSignal: true, labelUpdated: true, shortageChanged: true, newRecall: true, minReports: 20 }

let token
setupPinia()
beforeEach(() => {
  vi.resetAllMocks()
  token = 'jwt'
  services.auth.hasToken.mockImplementation(() => !!token)
  services.auth.clearSession.mockImplementation(() => { token = null })
})

// the store of a logged-in user whose profile is already known
function loggedIn() {
  const auth = useAuthStore()
  auth.setUser(user)
  return { auth, profile: useProfileStore() }
}

describe('updateProfile', () => {
  it('sends only the changed fields and writes the answer back to the auth user', async () => {
    const { auth, profile } = loggedIn()
    services.profile.update.mockResolvedValue({ ...user, email: 'new@example.com' })

    await profile.updateProfile({ username: 'p7_test_user', email: 'new@example.com' })

    expect(services.profile.update).toHaveBeenCalledWith({ email: 'new@example.com' })
    expect(auth.user.email).toBe('new@example.com')
    expect(auth.initials).toBe('P7')
  })

  it('shows the new username in the navbar initials', async () => {
    const { auth, profile } = loggedIn()
    services.profile.update.mockResolvedValue({ ...user, username: 'zz_user' })
    await profile.updateProfile({ username: 'zz_user', email: user.email })
    expect(auth.initials).toBe('ZZ')
  })

  it('does not call the backend when nothing changed', async () => {
    const { auth, profile } = loggedIn()
    expect(await profile.updateProfile({ ...user })).toEqual(user)
    expect(services.profile.update).not.toHaveBeenCalled()
    expect(auth.user).toEqual(user)
  })

  it('rethrows the error and keeps the old user (taken username)', async () => {
    const { auth, profile } = loggedIn()
    const failure = Object.assign(new Error('username already in use'), { status: 409 })
    services.profile.update.mockRejectedValue(failure)

    await expect(profile.updateProfile({ ...user, username: 'taken' })).rejects.toBe(failure)

    expect(auth.user).toEqual(user)
  })
})
