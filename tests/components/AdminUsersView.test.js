import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const { useUiStore } = await import('@/application/stores/useUiStore')
const AdminUsersView = (await import('@/presentation/views/AdminUsersView.vue')).default

const ME = { id: 'u-me', username: 'boss', email: 'boss@example.com', role: 'admin' }
const LUCA = { id: 'u-2', username: 'luca', email: 'luca@example.com', role: 'user' }

let pinia
const wrappers = []
const show = async () => {
  const w = mount(AdminUsersView, { attachTo: document.body, global: { plugins: [pinia] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const apiError = (status, message, fieldErrors = {}) => Object.assign(new Error(message), { status, fieldErrors })
const dialog = () => document.body.querySelector('[role="dialog"]')
const click = async (el) => { el.click(); await flushPromises() }
const setValue = async (el, value) => { el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }
const rowOf = (name) => [...document.body.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(name))

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.auth.hasToken.mockReturnValue(true)
  useAuthStore().user = { ...ME }
  services.admin.users.list.mockResolvedValue([ME, LUCA])
})
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('AdminUsersView', () => {
  it('lists the users on page 1 with their roles', async () => {
    await show()
    expect(services.admin.users.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(rowOf('luca').textContent).toContain('luca@example.com')
    expect(rowOf('luca').textContent).toContain('user')
    expect(rowOf('boss').textContent).toContain('admin')
  })

  it('marks the signed-in admin and locks their delete button', async () => {
    await show()
    expect(rowOf('boss').textContent).toContain('you')
    expect(rowOf('boss').querySelector('button[aria-label="Delete boss"]').disabled).toBe(true)
    expect(rowOf('luca').querySelector('button[aria-label="Delete luca"]').disabled).toBe(false)
  })

  it('shows an error with Retry when the list fails, and recovers', async () => {
    services.admin.users.list.mockRejectedValueOnce(apiError(500, 'Server error'))
    const w = await show()
    expect(w.find('[role="alert"]').text()).toContain('Server error')
    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(rowOf('luca')).toBeTruthy()
  })

  it('says so when a page has no users', async () => {
    services.admin.users.list.mockResolvedValue([])
    const w = await show()
    expect(w.text()).toContain('No users on this page')
  })

  describe('create', () => {
    it('validates before sending, then creates and toasts', async () => {
      services.admin.users.create.mockResolvedValue({ id: 'u-3' })
      const w = await show()
      await w.find('.bar .btn').trigger('click')
      await flushPromises()
      expect(dialog().textContent).toContain('New user')

      const create = [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes('Create user'))
      await click(create)
      expect(services.admin.users.create).not.toHaveBeenCalled()      // empty form
      expect(dialog().textContent).toMatch(/Username must be 3-32/)

      const [username, email, password] = dialog().querySelectorAll('input')
      await setValue(username, 'marta')
      await setValue(email, 'marta@example.com')
      await setValue(password, 'password123')
      await click(create)

      expect(services.admin.users.create).toHaveBeenCalledWith({
        username: 'marta', email: 'marta@example.com', password: 'password123', role: 'user',
      })
      expect(dialog()).toBeNull()
      expect(useUiStore().toast.message).toBe('User created.')
      expect(services.admin.users.list).toHaveBeenCalledTimes(2)       // reloaded
    })

    it('shows a taken email under the email field and keeps the dialog open', async () => {
      services.admin.users.create.mockRejectedValue(apiError(409, 'luca@example.com is already in use'))
      const w = await show()
      await w.find('.bar .btn').trigger('click')
      await flushPromises()
      const [username, email, password] = dialog().querySelectorAll('input')
      await setValue(username, 'marta')
      await setValue(email, 'luca@example.com')
      await setValue(password, 'password123')
      await click([...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes('Create user')))
      expect(dialog().textContent).toContain('luca@example.com is already in use')
      expect(dialog().querySelector('input[type="email"]').getAttribute('aria-invalid')).toBe('true')
    })
  })

  describe('edit', () => {
    const openLuca = async (w) => {
      await click(rowOf('luca').querySelector('button[aria-label="Edit luca"]'))
      return w
    }
    const save = () => [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes('Save changes'))

    it('opens with the saved values and sends only what changed', async () => {
      services.admin.users.update.mockResolvedValue({ ...LUCA, role: 'admin' })
      const w = await openLuca(await show())
      expect(dialog().querySelector('input').value).toBe('luca')
      expect(save().disabled).toBe(true)                               // nothing changed yet
      const role = dialog().querySelector('select')
      role.value = 'admin'
      role.dispatchEvent(new Event('change'))
      await flushPromises()
      await click(save())
      expect(services.admin.users.update).toHaveBeenCalledWith('u-2', { role: 'admin' })
      expect(useUiStore().toast.message).toBe('User updated.')
      expect(w.exists()).toBe(true)
    })

    it('locks the role of your own account', async () => {
      await show()
      await click(rowOf('boss').querySelector('button[aria-label="Edit boss"]'))
      expect(dialog().querySelector('select').disabled).toBe(true)
      expect(dialog().textContent).toContain('your own account')
    })

    it('updates the navbar user when you edit yourself', async () => {
      services.admin.users.update.mockResolvedValue({ ...ME, username: 'boss2' })
      await show()
      await click(rowOf('boss').querySelector('button[aria-label="Edit boss"]'))
      await setValue(dialog().querySelector('input'), 'boss2')
      await click(save())
      expect(useAuthStore().user.username).toBe('boss2')
    })

    it('shows the last-administrator refusal as a banner', async () => {
      services.admin.users.update.mockRejectedValue(apiError(422, 'This is the last administrator: make another admin first'))
      services.admin.users.list.mockResolvedValue([{ ...LUCA, role: 'admin' }, ME])
      await show()
      await click(rowOf('luca').querySelector('button[aria-label="Edit luca"]'))
      const role = dialog().querySelector('select')
      role.value = 'user'
      role.dispatchEvent(new Event('change'))
      await flushPromises()
      await click(save())
      expect(dialog().querySelector('.banner').textContent).toContain('last administrator')
    })
  })

  describe('delete', () => {
    it('asks to type the username, deletes, reloads and toasts', async () => {
      services.admin.users.remove.mockResolvedValue(undefined)
      await show()
      await click(rowOf('luca').querySelector('button[aria-label="Delete luca"]'))
      const confirm = [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes('Delete user'))
      expect(confirm.disabled).toBe(true)
      await setValue(dialog().querySelector('input'), 'luca')
      await click(confirm)
      expect(services.admin.users.remove).toHaveBeenCalledWith('u-2')
      expect(dialog()).toBeNull()
      expect(useUiStore().toast.message).toBe('User luca deleted.')
    })

    it('keeps the dialog open and shows the refusal', async () => {
      services.admin.users.remove.mockRejectedValue(apiError(422, 'This is the last administrator: make another admin first'))
      await show()
      await click(rowOf('luca').querySelector('button[aria-label="Delete luca"]'))
      await setValue(dialog().querySelector('input'), 'luca')
      await click([...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes('Delete user')))
      expect(dialog().querySelector('[role="alert"]').textContent).toContain('last administrator')
    })
  })
})
