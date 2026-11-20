import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { alertItem, followedDrug, signalList } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const { services } = await import('@/composition/container')
const { useAuthStore } = await import('@/application/stores/useAuthStore')
const DashboardView = (await import('@/presentation/views/DashboardView.vue')).default

const CUSTOM_DISCLAIMER = 'Custom disclaimer text from the API.'
const emerging = { ...toSignalList({ ...signalList, total: 12 }), disclaimer: CUSTOM_DISCLAIMER }

let pinia
const show = async () => {
  const w = mount(DashboardView, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' },
        DrugSearchBox: { template: '<div class="search-stub" />' },
      },
    },
  })
  await flushPromises()
  return w
}
const tileOf = (w, label) => w.findAll('.tile').find((t) => t.text().includes(label))

beforeEach(() => {
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.signal.emerging.mockResolvedValue(emerging)
})

function asUser() {
  services.auth.hasToken.mockReturnValue(true)
  useAuthStore().user = { id: 'u-1', username: 'p3_test_user', role: 'user' }
  services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug)])
  services.cabinet.alerts.mockResolvedValue([toAlert(alertItem)])
}

describe('DashboardView as a guest', () => {
  beforeEach(() => { services.auth.hasToken.mockReturnValue(false) })

  it('has the guest header, the emerging tile and the account call to action only', async () => {
    const w = await show()

    expect(w.find('h1').text()).toBe('Search drug safety and shortages')
    expect(w.findAll('.tile')).toHaveLength(1)
    expect(tileOf(w, 'Emerging signals this quarter').find('.value').text()).toBe('12')
    expect(w.find('.cta').text()).toContain('Create an account to follow medicines')
    expect(w.text()).not.toContain('Latest alerts')
  })

  it('never calls the cabinet endpoints', async () => {
    await show()

    expect(services.signal.emerging).toHaveBeenCalledOnce()
    expect(services.cabinet.list).not.toHaveBeenCalled()
    expect(services.cabinet.alerts).not.toHaveBeenCalled()
  })

  it('titles the card with the quarter of the response and lists the rows with a sparkline', async () => {
    const w = await show()

    expect(w.find('#emerging-title').text()).toBe('Emerging signals · 2026Q3')
    const cells = w.findAll('tbody tr')[0].findAll('td').map((c) => c.text())
    expect(cells.slice(0, 4)).toEqual(['ibuprofen', 'Gastrointestinal haemorrhage', '1204', '4.87'])
    expect(w.findAll('tbody tr')[0].find('svg.sparkline').exists()).toBe(true)
  })

  it('opens /signals for the drug and reaction when a row is clicked', async () => {
    const w = await show()

    await w.find('tbody tr').trigger('click')

    expect(push).toHaveBeenCalledWith({
      path: '/signals',
      query: { rxcui: '5640', drug: 'ibuprofen', reaction: 'Gastrointestinal haemorrhage', min: '3', all: '1' },
    })
  })

  it('links to the emerging tab of the signals view', async () => {
    const w = await show()

    const link = w.findAll('a.link').find((a) => a.text() === 'Open signals')
    expect(JSON.parse(link.attributes('data-to'))).toEqual({ path: '/signals', query: { tab: 'emerging' } })
  })

  it('shows the disclaimer of the response', async () => {
    const w = await show()

    expect(w.find('.disclaimer').text()).toBe(CUSTOM_DISCLAIMER)
  })

  it('shows the default disclaimer while the emerging signals have not arrived', async () => {
    services.signal.emerging.mockReturnValue(new Promise(() => {}))
    const w = await show()

    expect(w.find('.disclaimer').text()).toContain('voluntary and unverified')
  })

  it('shows an error with Retry when the emerging signals fail, and loads again on Retry', async () => {
    services.signal.emerging.mockRejectedValueOnce(new Error('Network Error'))
    const w = await show()
    expect(w.find('[role="alert"]').text()).toContain('Could not load emerging signals')
    expect(w.find('table').exists()).toBe(false)
    expect(tileOf(w, 'Emerging signals this quarter').find('.value').text()).toBe('–')

    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(services.signal.emerging).toHaveBeenCalledTimes(2)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(1)
  })

  it('says so when there are no emerging signals', async () => {
    services.signal.emerging.mockResolvedValue({ ...emerging, items: [], total: 0 })
    const w = await show()

    expect(w.text()).toContain('No emerging signals in 2026Q3 yet.')
  })
})

describe('DashboardView as a user', () => {
  it('welcomes the user by name and shows the four tiles without the call to action', async () => {
    asUser()
    const w = await show()

    expect(w.find('h1').text()).toBe('Welcome back, p3_test_user')
    expect(w.findAll('.tile')).toHaveLength(4)
    expect(tileOf(w, 'Medicines followed').find('.value').text()).toBe('1')
    expect(tileOf(w, 'New alerts').find('.value').text()).toBe('1')
    expect(tileOf(w, 'in shortage').find('.value').text()).toBe('1')
    expect(tileOf(w, 'Emerging signals this quarter').find('.value').text()).toBe('12')
    expect(w.find('.cta').exists()).toBe(false)
  })

  it('lists the latest alerts with the drug name and a relative time', async () => {
    asUser()
    const w = await show()

    const item = w.find('#alerts-title').element.closest('section').querySelector('li')
    expect(item.textContent).toContain('ibuprofen')
    expect(item.textContent).toContain('Ibuprofen tablets are now in shortage.')
    expect(item.querySelector('time').getAttribute('datetime')).toBe('2026-11-18T09:30:00Z')
    expect(item.querySelector('time').textContent).toMatch(/ago|yesterday|\d{4}-\d{2}-\d{2}/)
    expect(item.querySelector('.dot').classList.contains('amber')).toBe(true)
  })

  it('keeps the other cards when the alerts fail', async () => {
    asUser()
    services.cabinet.alerts.mockRejectedValue(new Error('boom'))
    const w = await show()

    expect(w.text()).toContain('Could not load your alerts.')
    expect(w.findAll('tbody tr')).toHaveLength(1)
    expect(tileOf(w, 'Medicines followed').find('.value').text()).toBe('1')
    expect(tileOf(w, 'New alerts').find('.value').text()).toBe('–')
  })

  it('says so when there are no alerts yet', async () => {
    asUser()
    services.cabinet.alerts.mockResolvedValue([])
    const w = await show()

    expect(w.text()).toContain('No alerts yet.')
    expect(tileOf(w, 'New alerts').find('.value').text()).toBe('0')
  })

  it('links "View all" to the medicine cabinet', async () => {
    asUser()
    const w = await show()

    const link = w.findAll('a.link').find((a) => a.text() === 'View all')
    expect(JSON.parse(link.attributes('data-to'))).toBe('/my-medicines')
  })
})
