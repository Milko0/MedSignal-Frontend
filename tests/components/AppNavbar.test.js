import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { alertItem, followedDrug, followedDrugNoShortage } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')
const AppNavbar = (await import('@/presentation/components/common/AppNavbar.vue')).default

let pinia
const wrappers = []   // unmounted after each test: a mounted navbar keeps listening on `document`
const show = () => wrappers[wrappers.push(mount(AppNavbar, {
  attachTo: document.body,
  global: {
    plugins: [pinia],
    stubs: { RouterLink: { props: ['to'], template: '<a :href="JSON.stringify(to)"><slot /></a>' }, DrugSearchBox: true },
  },
})) - 1]
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
})

function loggedIn(overrides = {}) {
  services.auth.hasToken.mockReturnValue(true)
  services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug), toFollowedDrug(followedDrugNoShortage)])
  services.cabinet.alerts.mockResolvedValue([toAlert(alertItem)])
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

describe('AppNavbar: medicines count and alert bell', () => {
  const mounted = async () => { const w = show(); await flushPromises(); return w }

  it('reads the cabinet once when the page opens logged in', async () => {
    loggedIn()
    await mounted()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
  })

  it('shows the number of followed medicines on the My medicines link', async () => {
    loggedIn()
    const w = await mounted()

    expect(w.find('nav a[href*="my-medicines"]').text()).toBe('My medicines 2')
  })

  it('shows the bell with the number of alerts', async () => {
    loggedIn()
    const w = await mounted()

    expect(w.find('.btn-bell').attributes('aria-label')).toBe('Alerts, 1 alert')
    expect(w.find('.btn-bell .dot').text()).toBe('1')
  })

  it('a guest has no bell and no cabinet request', async () => {
    services.auth.hasToken.mockReturnValue(false)
    const w = await mounted()

    expect(w.find('.btn-bell').exists()).toBe(false)
    expect(services.cabinet.list).not.toHaveBeenCalled()
    expect(services.cabinet.alerts).not.toHaveBeenCalled()
  })

  it('reads the cabinet when a guest logs in while the page is open', async () => {
    services.auth.hasToken.mockReturnValue(false)
    services.auth.login.mockImplementation(async () => { services.auth.hasToken.mockReturnValue(true); return { id: 'u-1', username: 'x', role: 'user' } })
    services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug)])
    services.cabinet.alerts.mockResolvedValue([])
    const w = await mounted()
    expect(services.cabinet.list).not.toHaveBeenCalled()

    await useAuthStore().login({ identifier: 'x', password: 'y' })
    await flushPromises()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(w.find('nav a[href*="my-medicines"]').text()).toBe('My medicines 1')
    expect(w.find('.btn-bell').exists()).toBe(true)
  })

  it('logging out clears the count and the bell at once', async () => {
    const auth = loggedIn()
    services.auth.logout.mockImplementation(async () => { services.auth.hasToken.mockReturnValue(false) })
    const w = await mounted()
    expect(w.find('.btn-bell .dot').exists()).toBe(true)

    await auth.logout()
    await flushPromises()

    expect(w.find('.btn-bell').exists()).toBe(false)
    expect(w.text()).not.toContain('My medicines')
    expect(useCabinetStore().followed).toEqual([])
    expect(useCabinetStore().alerts).toEqual([])
  })

  describe('when the window comes back', () => {
    const come = (state = 'visible') => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
      document.dispatchEvent(new Event('visibilitychange'))
    }

    it('reads the alerts again if the last read is older than a minute', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
      loggedIn()
      await mounted()
      services.cabinet.alerts.mockClear()

      vi.setSystemTime(new Date('2026-11-20T12:02:00Z'))
      come()
      await flushPromises()

      expect(services.cabinet.alerts).toHaveBeenCalledOnce()
      expect(services.cabinet.list).toHaveBeenCalledOnce()   // only the alerts
      vi.useRealTimers()
    })

    it('does nothing if they were read less than a minute ago', async () => {
      loggedIn()
      await mounted()
      services.cabinet.alerts.mockClear()

      come('visible')
      await flushPromises()

      expect(services.cabinet.alerts).not.toHaveBeenCalled()
    })

    it('does nothing while the window is hidden', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
      loggedIn()
      await mounted()
      services.cabinet.alerts.mockClear()

      vi.setSystemTime(new Date('2026-11-20T12:05:00Z'))
      come('hidden')
      await flushPromises()

      expect(services.cabinet.alerts).not.toHaveBeenCalled()
      vi.useRealTimers()
    })

    it('does nothing for a guest', async () => {
      services.auth.hasToken.mockReturnValue(false)
      await mounted()

      come('visible')
      await flushPromises()

      expect(services.cabinet.alerts).not.toHaveBeenCalled()
    })
  })
})

