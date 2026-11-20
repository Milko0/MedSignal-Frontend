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
  services.profile.getAlertSettings.mockResolvedValue({ ...settings })
})

function loggedIn() {
  const auth = useAuthStore()
  auth.setUser(user)
  return { auth, profile: useProfileStore() }
}

describe('alert settings', () => {
  it('load reads them once; the editable copy starts equal to the saved one', async () => {
    const { profile } = loggedIn()

    await profile.load()
    await profile.load()

    expect(services.profile.getAlertSettings).toHaveBeenCalledOnce()
    expect(profile.alertSettings).toEqual(settings)
    expect(profile.savedSettings).toEqual(settings)
    expect(profile.loaded).toBe(true)
    expect(profile.hasUnsavedChanges).toBe(false)
    expect(profile.minReports).toBe(20)
  })

  it('callers at the same time share one request', async () => {
    const { profile } = loggedIn()
    await Promise.all([profile.load(), profile.load()])
    expect(services.profile.getAlertSettings).toHaveBeenCalledOnce()
  })

  it('load never throws: the error is kept, and a retry works', async () => {
    const { profile } = loggedIn()
    services.profile.getAlertSettings.mockRejectedValueOnce(new Error('boom'))

    await expect(profile.load()).resolves.toBeUndefined()
    expect(profile.loadError.message).toBe('boom')
    expect(profile.loaded).toBe(false)
    expect(profile.minReports).toBeNull()

    await profile.load()
    expect(profile.loadError).toBeNull()
    expect(profile.loaded).toBe(true)
  })

  it('detects unsaved changes and goes back to none when the change is undone', async () => {
    const { profile } = loggedIn()
    await profile.load()

    profile.alertSettings.newRecall = false
    expect(profile.hasUnsavedChanges).toBe(true)
    profile.alertSettings.newRecall = true
    expect(profile.hasUnsavedChanges).toBe(false)

    profile.alertSettings.minReports = 50
    expect(profile.hasUnsavedChanges).toBe(true)
    expect(profile.minReports).toBe(20) // other pages use what is saved, not what is being edited
  })

  it('saveSettings sends the whole object, then the saved copy is the answer', async () => {
    const { profile } = loggedIn()
    await profile.load()
    profile.alertSettings.newRecall = false
    profile.alertSettings.minReports = 50
    services.profile.saveAlertSettings.mockResolvedValue({ ...settings, newRecall: false, minReports: 50 })

    await profile.saveSettings()

    expect(services.profile.saveAlertSettings).toHaveBeenCalledWith({ ...settings, newRecall: false, minReports: 50 })
    expect(profile.savedSettings).toEqual({ ...settings, newRecall: false, minReports: 50 })
    expect(profile.hasUnsavedChanges).toBe(false)
    expect(profile.minReports).toBe(50)
    expect(profile.saving).toBe(false)
  })

  it('a failed save rethrows, keeps the edits and the saved copy, and stops saving', async () => {
    const { profile } = loggedIn()
    await profile.load()
    profile.alertSettings.newSignal = false
    services.profile.saveAlertSettings.mockRejectedValue(new Error('boom'))

    await expect(profile.saveSettings()).rejects.toThrow('boom')

    expect(profile.alertSettings.newSignal).toBe(false)
    expect(profile.savedSettings.newSignal).toBe(true)
    expect(profile.hasUnsavedChanges).toBe(true)
    expect(profile.saving).toBe(false)
  })

  it('does nothing before the settings are loaded and does not save twice at once', async () => {
    const { profile } = loggedIn()
    await profile.saveSettings()
    expect(services.profile.saveAlertSettings).not.toHaveBeenCalled()

    await profile.load()
    profile.alertSettings.newSignal = false
    let finish
    services.profile.saveAlertSettings.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const first = profile.saveSettings()
    const second = profile.saveSettings()
    finish({ ...settings, newSignal: false })
    await Promise.all([first, second])

    expect(services.profile.saveAlertSettings).toHaveBeenCalledOnce()
  })

  it('discardSettings puts the saved values back', async () => {
    const { profile } = loggedIn()
    await profile.load()
    profile.alertSettings.newSignal = false
    profile.alertSettings.minReports = 100

    profile.discardSettings()

    expect(profile.alertSettings).toEqual(settings)
    expect(profile.hasUnsavedChanges).toBe(false)
  })

  it('a forced reload keeps the edits the user already made', async () => {
    const { profile } = loggedIn()
    await profile.load()
    profile.alertSettings.newSignal = false

    await profile.load({ force: true })

    expect(profile.alertSettings.newSignal).toBe(false)
    expect(profile.hasUnsavedChanges).toBe(true)
  })

  it('reset empties everything and drops an answer that was still on its way', async () => {
    const { profile } = loggedIn()
    let answer
    services.profile.getAlertSettings.mockReturnValue(new Promise((resolve) => { answer = resolve }))
    const loading = profile.load()

    profile.reset()
    answer({ ...settings })
    await loading

    expect(profile.loaded).toBe(false)
    expect(profile.alertSettings).toBeNull()
  })

  it('logging out clears the settings of that user', async () => {
    const { auth, profile } = loggedIn()
    services.auth.logout.mockResolvedValue(undefined)
    await profile.load()

    await auth.logout()

    expect(profile.loaded).toBe(false)
    expect(profile.minReports).toBeNull()
  })
})

describe('deleteAccount', () => {
  it('deletes, then ends the session here without calling /auth/logout', async () => {
    const { auth, profile } = loggedIn()
    services.profile.remove.mockResolvedValue(undefined)
    await profile.load()

    await profile.deleteAccount()

    expect(services.profile.remove).toHaveBeenCalledOnce()
    expect(services.auth.logout).not.toHaveBeenCalled()
    expect(services.auth.clearSession).toHaveBeenCalled()
    expect(auth.loggedIn).toBe(false)
    expect(auth.user).toBeNull()
    expect(profile.loaded).toBe(false)
  })

  it('a refused delete rethrows and leaves the user logged in', async () => {
    const { auth, profile } = loggedIn()
    services.profile.remove.mockRejectedValue(new Error('boom'))

    await expect(profile.deleteAccount()).rejects.toThrow('boom')

    expect(auth.loggedIn).toBe(true)
    expect(auth.user).toEqual(user)
    expect(services.auth.clearSession).not.toHaveBeenCalled()
  })
})
