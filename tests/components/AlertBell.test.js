import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { alertItem, followedDrug } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')
const AlertBell = (await import('@/presentation/components/common/AlertBell.vue')).default

const RouterLink = { props: ['to'], emits: ['click'], template: '<a :data-to="JSON.stringify(to)" @click="$emit(\'click\')"><slot /></a>' }
const alert = (n, over = {}) => toAlert({ ...alertItem, alert_id: `a-${n}`, created_at: new Date(Date.now() - n * 3600 * 1000).toISOString(), ...over })

let pinia
async function show(alerts) {
  services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug)])
  services.cabinet.alerts.mockResolvedValue(alerts)
  await useCabinetStore().load()
  return mount(AlertBell, { attachTo: document.body, global: { plugins: [pinia], stubs: { RouterLink } } })
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
})

describe('AlertBell', () => {
  it('shows no count when there are no alerts', async () => {
    const w = await show([])

    expect(w.find('.dot').exists()).toBe(false)
    expect(w.find('button').attributes('aria-label')).toBe('Alerts, none')
  })

  it('shows the number of alerts, and says it for screen readers', async () => {
    const w = await show([alert(1), alert(2), alert(3)])

    expect(w.find('.dot').text()).toBe('3')
    expect(w.find('button').attributes('aria-label')).toBe('Alerts, 3 alerts')
  })

  it('shows 9+ from ten alerts on', async () => {
    const w = await show(Array.from({ length: 12 }, (_, i) => alert(i + 1)))

    expect(w.find('.dot').text()).toBe('9+')
    expect(w.find('button').attributes('aria-label')).toBe('Alerts, 12 alerts')
  })

  it('matches the alerts of the store as they change', async () => {
    const w = await show([alert(1), alert(2)])
    expect(w.find('.dot').text()).toBe('2')

    useCabinetStore().alerts = [alert(1)]
    await flushPromises()
    expect(w.find('.dot').text()).toBe('1')

    useCabinetStore().reset()
    await flushPromises()
    expect(w.find('.dot').exists()).toBe(false)
  })

  describe('the list', () => {
    it('is closed at first and opens on click', async () => {
      const w = await show([alert(1)])
      expect(w.find('[role="menu"]').exists()).toBe(false)

      await w.find('button').trigger('click')

      expect(w.find('[role="menu"]').exists()).toBe(true)
      expect(w.find('button').attributes('aria-expanded')).toBe('true')
    })

    it('shows the newest five, newest first, with drug, type, message and time', async () => {
      const w = await show([alert(7), alert(3), alert(1), alert(6), alert(2), alert(5), alert(4)])
      await w.find('button').trigger('click')

      const items = w.findAll('[role="menu"] li')
      expect(items).toHaveLength(5)
      expect(items.map((i) => i.find('time').text())).toEqual(['1 h ago', '2 h ago', '3 h ago', '4 h ago', '5 h ago'])
      expect(items[0].text()).toContain('ibuprofen: Shortage')
      expect(items[0].text()).toContain('Ibuprofen tablets are now in shortage.')
    })

    it('opens the drug of an alert, and falls back to the rxcui for a drug that is not followed', async () => {
      const w = await show([alert(1), alert(2, { drug_rxcui: '999' })])
      await w.find('button').trigger('click')

      const links = w.findAll('[role="menu"] li a')
      expect(JSON.parse(links[0].attributes('data-to'))).toEqual({ name: 'drug', params: { rxcui: '5640' } })
      expect(links[1].text()).toContain('999: Shortage')
    })

    it('offers "See all", which goes to My medicines', async () => {
      const w = await show([alert(1)])
      await w.find('button').trigger('click')

      const all = w.find('a.all')
      expect(all.text()).toBe('See all')
      expect(JSON.parse(all.attributes('data-to'))).toBe('/my-medicines')
    })

    it('says "No alerts" when there are none, and still offers See all', async () => {
      const w = await show([])
      await w.find('button').trigger('click')

      expect(w.find('.none').text()).toBe('No alerts')
      expect(w.find('a.all').exists()).toBe(true)
    })

    it('closes on a click elsewhere, on Escape and when a link is followed', async () => {
      const w = await show([alert(1)])

      await w.find('button').trigger('click')
      document.body.click()
      await flushPromises()
      expect(w.find('[role="menu"]').exists()).toBe(false)

      await w.find('button').trigger('click')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(w.find('[role="menu"]').exists()).toBe(false)

      await w.find('button').trigger('click')
      await w.find('a.all').trigger('click')
      expect(w.find('[role="menu"]').exists()).toBe(false)
    })

    it('stays open when the click is inside it', async () => {
      const w = await show([alert(1)])
      await w.find('button').trigger('click')

      await w.find('[role="menu"]').trigger('click')

      expect(w.find('[role="menu"]').exists()).toBe(true)
    })
  })
})
