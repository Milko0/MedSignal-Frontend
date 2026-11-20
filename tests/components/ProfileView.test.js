import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const ProfileView = (await import('@/presentation/views/ProfileView.vue')).default

const user = { id: 'u-1', username: 'p7_test_user', email: 'p7_test_user@example.com', role: 'user' }
const failure = (status, message) => Object.assign(new Error(message), { status })

let pinia
let token
async function show({ withUser = true } = {}) {
  const auth = useAuthStore()
  if (withUser) auth.setUser(user)
  const w = mount(ProfileView, { attachTo: document.body, global: { plugins: [pinia] } })
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
