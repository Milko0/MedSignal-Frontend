import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const AppNavbar = (await import('@/presentation/components/common/AppNavbar.vue')).default

let pinia
const show = () => mount(AppNavbar, {
  attachTo: document.body,
  global: {
    plugins: [pinia],
    stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }, DrugSearchBox: true },
  },
})

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
})

function loggedIn(overrides = {}) {
  services.auth.hasToken.mockReturnValue(true)
  const auth = useAuthStore()
  auth.user = { id: 'u-1', username: 'p2_test_user', role: 'user', ...overrides }
  return auth
}

describe('AppNavbar', () => {
  it('offers Log in to a guest and hides My medicines and the avatar', () => {
    services.auth.hasToken.mockReturnValue(false)
    const w = show()
    expect(w.text()).toContain('Log in')
    expect(w.text()).not.toContain('My medicines')
    expect(w.find('.avatar').exists()).toBe(false)
  })

  it('shows the initials and the My medicines link when logged in', () => {
    loggedIn()
    const w = show()
    expect(w.find('.avatar').text()).toBe('P2')
    expect(w.text()).toContain('My medicines')
    expect(w.text()).not.toContain('Log in')
  })

  it('opens a menu with Profile and Log out, closes it on an outside click', async () => {
    loggedIn()
    const w = show()
    expect(w.find('[role="menu"]').exists()).toBe(false)

    await w.find('.avatar').trigger('click')
    expect(w.find('[role="menu"]').text()).toContain('Profile')
    expect(w.find('[role="menu"]').text()).toContain('Log out')

    document.body.click()
    await flushPromises()
    expect(w.find('[role="menu"]').exists()).toBe(false)
  })

  it('tags an admin in the menu', async () => {
    loggedIn({ role: 'admin' })
    const w = show()
    await w.find('.avatar').trigger('click')
    expect(w.find('.tag').text()).toBe('admin')
  })

  it('logs out, then goes to the dashboard', async () => {
    const auth = loggedIn()
    services.auth.logout.mockImplementation(async () => { services.auth.hasToken.mockReturnValue(false) })
    const w = show()
    await w.find('.avatar').trigger('click')

    await w.findAll('[role="menuitem"]').find((el) => el.text() === 'Log out').trigger('click')
    await flushPromises()

    expect(services.auth.logout).toHaveBeenCalledOnce()
    expect(auth.loggedIn).toBe(false)
    expect(push).toHaveBeenCalledWith({ name: 'dashboard' })
    expect(w.text()).toContain('Log in')
  })
})
