import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const ProfileView = (await import('@/presentation/views/ProfileView.vue')).default

const user = { id: 'u-1', username: 'p7_test_user', email: 'p7_test_user@example.com', role: 'user' }
const settings = { newSignal: true, labelUpdated: true, shortageChanged: true, newRecall: true, minReports: 20 }
const failure = (status, message) => Object.assign(new Error(message), { status })

let pinia
let token
let router
async function show({ withUser = true } = {}) {
  const auth = useAuthStore()
  if (withUser) auth.setUser(user)
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'profile', component: ProfileView },
      { path: '/auth', name: 'auth', component: { template: '<div />' } },
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
    ],
  })
  await router.push('/profile')
  await router.isReady()
  const w = mount(ProfileView, { attachTo: document.body, global: { plugins: [pinia, router] } })
  await flushPromises()
  return w
}
const field = (w, label) => w.findAll('label').find((l) => l.text() === label)
const input = (w, label) => w.find(`#${field(w, label).attributes('for')}`)
const saveButton = (w) => w.findAll('button').find((b) => b.text().startsWith('Save changes'))

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  token = 'jwt'
  services.auth.hasToken.mockImplementation(() => !!token)
  services.auth.clearSession.mockImplementation(() => { token = null })
  services.profile.getAlertSettings.mockResolvedValue({ ...settings })
})

describe('profile card', () => {
  it('shows the username and email of the user', async () => {
    const w = await show()
    expect(input(w, 'Username').element.value).toBe('p7_test_user')
    expect(input(w, 'Email').element.value).toBe('p7_test_user@example.com')
  })

  it('"Save changes" is disabled until something changed, and again after the change is undone', async () => {
    const w = await show()
    expect(saveButton(w).attributes('disabled')).toBeDefined()

    await input(w, 'Email').setValue('new@example.com')
    expect(saveButton(w).attributes('disabled')).toBeUndefined()

    await input(w, 'Email').setValue('p7_test_user@example.com')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('saves only the changed field, shows the saved state and keeps the button disabled afterwards', async () => {
    services.profile.update.mockResolvedValue({ ...user, email: 'new@example.com' })
    const w = await show()

    await input(w, 'Email').setValue('new@example.com')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(services.profile.update).toHaveBeenCalledWith({ email: 'new@example.com' })
    expect(w.text()).toContain('Profile saved.')
    expect(useAuthStore().user.email).toBe('new@example.com')
    expect(saveButton(w).attributes('disabled')).toBeDefined()
  })

  it('shows the lower-cased email the server stored', async () => {
    services.profile.update.mockResolvedValue({ ...user, email: 'mixed@example.com' })
    const w = await show()
    await input(w, 'Email').setValue('Mixed@Example.com')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(input(w, 'Email').element.value).toBe('mixed@example.com')
  })

  it('does not send an invalid form and says what is wrong', async () => {
    const w = await show()
    await input(w, 'Username').setValue('ab')
    await input(w, 'Email').setValue('nope')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(services.profile.update).not.toHaveBeenCalled()
    expect(w.text()).toContain('Username must be 3-32 characters')
    expect(w.text()).toContain('Enter a valid email address')
  })

  it('a taken username (409) shows under the username field and nothing changes', async () => {
    services.profile.update.mockRejectedValue(failure(409, 'username already in use'))
    const w = await show()

    await input(w, 'Username').setValue('taken_name')
    await w.find('form').trigger('submit')
    await flushPromises()

    expect(w.find('#' + input(w, 'Username').attributes('aria-describedby')).text()).toBe('username already in use')
    expect(input(w, 'Username').attributes('aria-invalid')).toBe('true')
    expect(useAuthStore().user.username).toBe('p7_test_user')
    expect(w.text()).not.toContain('Profile saved.')
  })

  it('a network failure shows a banner and the form can be sent again', async () => {
    services.profile.update.mockRejectedValueOnce(failure(0, 'Cannot reach the server. Check your connection and try again.'))
    services.profile.update.mockResolvedValueOnce({ ...user, username: 'second_try' })
    const w = await show()

    await input(w, 'Username').setValue('second_try')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('.banner').text()).toMatch(/cannot reach the server/i)

    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('.banner').exists()).toBe(false)
    expect(w.text()).toContain('Profile saved.')
  })

  it('without a loaded user it offers a retry instead of an empty form', async () => {
    services.auth.restore.mockResolvedValue(user)
    const w = await show({ withUser: false })
    expect(w.text()).toContain('Could not load your profile.')
    expect(w.find('form').exists()).toBe(false)

    await w.find('button.link').trigger('click')
    await flushPromises()
    expect(services.auth.restore).toHaveBeenCalled()
    expect(input(w, 'Username').element.value).toBe('p7_test_user')
  })
})

describe('password card', () => {
  const open = async (w) => {
    await w.findAll('button').find((b) => b.text() === 'Change password').trigger('click')
  }
  const pw = (w, label) => w.find(`#${w.findAll('label').find((l) => l.text() === label).attributes('for')}`)
  const fill = async (w, current, next, confirm = next) => {
    await pw(w, 'Current password').setValue(current)
    await pw(w, 'New password').setValue(next)
    await pw(w, 'Confirm new password').setValue(confirm)
  }
  const send = async (w) => {
    await w.find('form[aria-label="Change password"]').trigger('submit')
    await flushPromises()
  }

  it('is closed until "Change password" is clicked and can be cancelled', async () => {
    const w = await show()
    expect(w.find('form[aria-label="Change password"]').exists()).toBe(false)
    await open(w)
    expect(w.find('form[aria-label="Change password"]').exists()).toBe(true)
    await w.findAll('button').find((b) => b.text() === 'Cancel').trigger('click')
    expect(w.find('form[aria-label="Change password"]').exists()).toBe(false)
  })

  it('does not send a mismatching or short password', async () => {
    const w = await show()
    await open(w)
    await fill(w, 'old-secret', 'new-secret-1', 'new-secret-2')
    await send(w)
    expect(w.text()).toContain('The two passwords do not match')

    await fill(w, 'old-secret', 'short')
    await send(w)
    expect(w.text()).toContain('at least 8 characters')
    expect(services.profile.changePassword).not.toHaveBeenCalled()
  })

  it('a wrong current password shows under that field and the user stays logged in', async () => {
    services.profile.changePassword.mockRejectedValue(failure(401, 'Current password is wrong'))
    const w = await show()
    await open(w)
    await fill(w, 'wrong-secret', 'new-secret-1')
    await send(w)

    const current = pw(w, 'Current password')
    expect(current.attributes('aria-invalid')).toBe('true')
    expect(w.find('#' + current.attributes('aria-describedby')).text()).toBe('Current password is wrong')
    expect(useAuthStore().loggedIn).toBe(true)
    expect(w.find('form[aria-label="Change password"]').exists()).toBe(true)
  })

  it('sends the passwords, then closes, empties the form and confirms', async () => {
    services.profile.changePassword.mockResolvedValue(undefined)
    const w = await show()
    await open(w)
    await fill(w, 'old-secret', 'new-secret-1')
    await send(w)

    expect(services.profile.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-secret', newPassword: 'new-secret-1' })
    expect(w.find('form[aria-label="Change password"]').exists()).toBe(false)
    expect(w.text()).toContain('Password changed.')

    await open(w)
    expect(pw(w, 'New password').element.value).toBe('')
    expect(w.text()).not.toContain('Password changed.')
  })
})

describe('alert settings card', () => {
  const sw = (w, label) => w.findAll('.toggle').find((t) => t.find('.label').text() === label).find('input')
  const min = (w) => w.find('select')
  const saveSettings = (w) => w.findAll('button').find((b) => b.text().startsWith('Save settings'))
  const sendSettings = async (w) => {
    await w.find('form[aria-label="Alert settings"]').trigger('submit')
    await flushPromises()
  }

  it('reads the settings on opening and shows the four switches (all on) and the minimum 20', async () => {
    const w = await show()

    expect(services.profile.getAlertSettings).toHaveBeenCalledOnce()
    for (const label of ['New safety signal', 'Label updated', 'Shortage status changes', 'New recall']) {
      expect(sw(w, label).element.checked, label).toBe(true)
    }
    expect(min(w).element.value).toBe('20')
    expect([...min(w).element.options].map((o) => o.value)).toEqual(['3', '5', '10', '20', '50', '100'])
  })

  it('shows the explanation under each switch', async () => {
    const w = await show()
    expect(w.findAll('.toggle .hint')).toHaveLength(4)
  })

  it('"Save settings" is disabled until something changes, and a note appears with the change', async () => {
    const w = await show()
    expect(saveSettings(w).attributes('disabled')).toBeDefined()
    expect(w.text()).not.toContain('unsaved changes')

    await sw(w, 'New recall').setValue(false)
    expect(saveSettings(w).attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain('You have unsaved changes.')

    await sw(w, 'New recall').setValue(true)
    expect(saveSettings(w).attributes('disabled')).toBeDefined()
    expect(w.text()).not.toContain('unsaved changes')
  })

  it('nothing is sent when a switch is toggled, only when the user saves', async () => {
    const w = await show()
    await sw(w, 'New recall').setValue(false)
    await min(w).setValue('50')
    expect(services.profile.saveAlertSettings).not.toHaveBeenCalled()
  })

  it('saves the whole object (recall off, minimum 50) and shows it as saved', async () => {
    services.profile.saveAlertSettings.mockResolvedValue({ ...settings, newRecall: false, minReports: 50 })
    const w = await show()

    await sw(w, 'New recall').setValue(false)
    await min(w).setValue('50')
    await sendSettings(w)

    expect(services.profile.saveAlertSettings).toHaveBeenCalledWith({ ...settings, newRecall: false, minReports: 50 })
    expect(w.text()).toContain('Settings saved.')
    expect(w.text()).not.toContain('unsaved changes')
    expect(saveSettings(w).attributes('disabled')).toBeDefined()
    expect(min(w).element.value).toBe('50')
  })

  it('a failed save shows the error, keeps the edits and can be tried again', async () => {
    services.profile.saveAlertSettings.mockRejectedValueOnce(failure(0, 'Cannot reach the server. Check your connection and try again.'))
    services.profile.saveAlertSettings.mockResolvedValueOnce({ ...settings, newSignal: false })
    const w = await show()

    await sw(w, 'New safety signal').setValue(false)
    await sendSettings(w)
    expect(w.find('.banner').text()).toMatch(/cannot reach the server/i)
    expect(sw(w, 'New safety signal').element.checked).toBe(false)
    expect(w.text()).toContain('You have unsaved changes.')

    await sendSettings(w)
    expect(w.find('.banner').exists()).toBe(false)
    expect(w.text()).toContain('Settings saved.')
  })

  it('"Discard changes" puts the saved values back', async () => {
    const w = await show()
    await sw(w, 'Label updated').setValue(false)
    await min(w).setValue('100')

    await w.findAll('button').find((b) => b.text() === 'Discard changes').trigger('click')

    expect(sw(w, 'Label updated').element.checked).toBe(true)
    expect(min(w).element.value).toBe('20')
    expect(w.text()).not.toContain('unsaved changes')
  })

  it('shows a saved minimum that is not one of the choices', async () => {
    services.profile.getAlertSettings.mockResolvedValue({ ...settings, minReports: 25 })
    const w = await show()
    expect(min(w).element.value).toBe('25')
    expect([...min(w).element.options].map((o) => o.value)).toEqual(['3', '5', '10', '20', '25', '50', '100'])
  })

  it('shows what was saved earlier (a recall alert off, minimum 50)', async () => {
    services.profile.getAlertSettings.mockResolvedValue({ ...settings, newRecall: false, minReports: 50 })
    const w = await show()
    expect(sw(w, 'New recall').element.checked).toBe(false)
    expect(min(w).element.value).toBe('50')
  })

  it('a failed read shows a retry, and the retry fills the card', async () => {
    services.profile.getAlertSettings.mockRejectedValueOnce(failure(500, 'boom'))
    const w = await show()
    expect(w.text()).toContain('Could not load your alert settings.')
    expect(w.find('form[aria-label="Alert settings"]').exists()).toBe(false)
    // the profile card does not depend on it
    expect(input(w, 'Username').element.value).toBe('p7_test_user')

    await w.findAll('button.link').find((b) => b.text() === 'Retry').trigger('click')
    await flushPromises()
    expect(w.find('form[aria-label="Alert settings"]').exists()).toBe(true)
  })

  it('has a menu entry that jumps to the section', async () => {
    const w = await show()
    expect(w.find('nav a[href="#alerts"]').exists()).toBe(true)
    expect(w.find('section#alerts').exists()).toBe(true)
  })
})

describe('account card', () => {
  const button = (w, text) => w.findAll('button').find((b) => b.text() === text)
  const dialog = (w) => w.find('[role="dialog"]')
  const ask = async (w) => { await button(w, 'Delete account').trigger('click'); await flushPromises() }
  const confirmButton = (w) => dialog(w).findAll('button').find((b) => b.text().startsWith('Delete my account'))

  it('"Log out" ends the session, calls /auth/logout and goes to the dashboard', async () => {
    services.auth.logout.mockResolvedValue(undefined)
    const w = await show()

    await button(w, 'Log out').trigger('click')
    await flushPromises()

    expect(services.auth.logout).toHaveBeenCalledOnce()
    expect(useAuthStore().loggedIn).toBe(false)
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('"Delete account" opens a dialog and deletes nothing yet', async () => {
    const w = await show()
    expect(dialog(w).exists()).toBe(false)

    await ask(w)

    expect(dialog(w).exists()).toBe(true)
    expect(dialog(w).attributes('aria-modal')).toBe('true')
    expect(dialog(w).text()).toContain('p7_test_user')
    expect(services.profile.remove).not.toHaveBeenCalled()
  })

  it('the confirm button needs the exact username', async () => {
    const w = await show()
    await ask(w)
    expect(confirmButton(w).attributes('disabled')).toBeDefined()

    for (const wrong of ['p7_test', 'P7_TEST_USER', 'p7_test_user_', 'someone else']) {
      await dialog(w).find('input').setValue(wrong)
      expect(confirmButton(w).attributes('disabled'), wrong).toBeDefined()
    }
    await dialog(w).find('input').setValue('p7_test_user')
    expect(confirmButton(w).attributes('disabled')).toBeUndefined()

    await dialog(w).find('input').setValue('  p7_test_user ')
    expect(confirmButton(w).attributes('disabled')).toBeUndefined()
  })

  it('Enter in the field does not delete while the name is wrong', async () => {
    const w = await show()
    await ask(w)
    await dialog(w).find('input').setValue('nope')
    await dialog(w).find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(services.profile.remove).not.toHaveBeenCalled()
  })

  it('Cancel and Escape close the dialog without deleting, and the field is empty next time', async () => {
    const w = await show()
    await ask(w)
    await dialog(w).find('input').setValue('p7_test_user')
    await button(w, 'Cancel').trigger('click')
    expect(dialog(w).exists()).toBe(false)

    await ask(w)
    expect(dialog(w).find('input').element.value).toBe('')
    await dialog(w).trigger('keydown', { key: 'Escape' })
    expect(dialog(w).exists()).toBe(false)
    expect(services.profile.remove).not.toHaveBeenCalled()
    expect(useAuthStore().loggedIn).toBe(true)
  })

  it('deletes, leaves the session without /auth/logout and lands on /auth with the notice flag', async () => {
    services.profile.remove.mockResolvedValue(undefined)
    const w = await show()
    await ask(w)
    await dialog(w).find('input').setValue('p7_test_user')

    await confirmButton(w).trigger('click')
    await flushPromises()

    expect(services.profile.remove).toHaveBeenCalledOnce()
    expect(services.auth.logout).not.toHaveBeenCalled()
    expect(useAuthStore().loggedIn).toBe(false)
    expect(useAuthStore().user).toBeNull()
    expect(router.currentRoute.value.name).toBe('auth')
    expect(router.currentRoute.value.query).toEqual({ deleted: '1' })
  })

  it('a refused delete shows the error in the dialog, keeps the user logged in and allows another try', async () => {
    services.profile.remove.mockRejectedValueOnce(failure(500, 'Request failed (500)'))
    services.profile.remove.mockResolvedValueOnce(undefined)
    const w = await show()
    await ask(w)
    await dialog(w).find('input').setValue('p7_test_user')

    await confirmButton(w).trigger('click')
    await flushPromises()

    expect(dialog(w).find('.banner').text()).toBe('Request failed (500)')
    expect(useAuthStore().loggedIn).toBe(true)
    expect(router.currentRoute.value.name).toBe('profile')

    await confirmButton(w).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('auth')
  })

  it('does not flash an error card while the session ends', async () => {
    services.profile.remove.mockResolvedValue(undefined)
    const w = await show()
    await ask(w)
    await dialog(w).find('input').setValue('p7_test_user')
    await confirmButton(w).trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('Could not load your profile.')
  })
})
