import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { alertItem, followedDrug, followedDrugNoShortage } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useUiStore } = await import('@/application/stores/useUiStore')
const { useCabinetStore } = await import('@/application/stores/useCabinetStore')
const MedicineCabinetView = (await import('@/presentation/views/MedicineCabinetView.vue')).default

const stubs = {
  RouterLink: { props: ['to'], template: '<a class="name" :data-to="JSON.stringify(to)"><slot /></a>' },
  DrugSearchBox: { template: '<div class="search-stub" />' },
}
const failure = (status = 500) => Object.assign(new Error('boom'), { status })
const alert = (id, over = {}) => toAlert({ ...alertItem, alert_id: id, ...over })
const warfarin = () => toFollowedDrug({ rxcui: '7', name: 'warfarin', shortage_status: null })

let pinia
async function show() {
  const w = mount(MedicineCabinetView, { attachTo: document.body, global: { plugins: [pinia], stubs } })
  await flushPromises()
  return w
}
const rowNames = (w) => w.findAll('.rows .name').map((a) => a.text())
const click = async (w, selector, text) => {
  await w.findAll(selector).find((el) => el.text().startsWith(text)).trigger('click')
  await flushPromises()
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug), toFollowedDrug(followedDrugNoShortage), warfarin()])
  services.cabinet.alerts.mockResolvedValue([
    alert('a-1', { type: 'SIGNAL', drug_rxcui: '7', message: 'New signal for warfarin.', created_at: '2026-11-19T09:00:00Z' }),
    alert('a-2', { type: 'SHORTAGE', drug_rxcui: '5640', created_at: '2026-11-18T09:00:00Z' }),
  ])
  services.cabinet.unfollow.mockResolvedValue(undefined)
  services.cabinet.dismiss.mockResolvedValue(undefined)
  services.cabinet.dismissAll.mockResolvedValue(undefined)
})

describe('MedicineCabinetView', () => {
  it('shows a loading line before the first answer, not the empty state', async () => {
    services.cabinet.list.mockReturnValue(new Promise(() => {}))
    const w = await show()

    expect(w.find('[role="status"]').text()).toBe('Loading…')
    expect(w.text()).not.toContain("You don't follow any medicine yet")
  })

  it('shows the count and one row per followed drug, drugs with alerts first', async () => {
    const w = await show()

    expect(w.find('.intro p').text()).toBe('3 medicines followed. Click a medicine to open its page.')
    expect(rowNames(w)).toEqual(['warfarin', 'ibuprofen', 'acetaminophen'])
  })

  it('shows each row\'s status: the newest alert, else the shortage status, else "No changes"', async () => {
    const w = await show()

    expect(w.findAll('.rows .chip').map((c) => c.text())).toEqual(['New signal', 'Shortage', 'No changes'])
  })

  it('says "1 medicine" for one', async () => {
    services.cabinet.list.mockResolvedValue([warfarin()])
    const w = await show()

    expect(w.find('.intro p').text()).toBe('1 medicine followed. Click a medicine to open its page.')
  })

  it('reads the lists once on entering', async () => {
    await show()

    expect(services.cabinet.list).toHaveBeenCalledOnce()
    expect(services.cabinet.alerts).toHaveBeenCalledOnce()
  })

  it('does not read them again when they were just loaded (the navbar did)', async () => {
    await useCabinetStore().load()
    services.cabinet.list.mockClear()
    services.cabinet.alerts.mockClear()

    await show()

    expect(services.cabinet.list).not.toHaveBeenCalled()
    expect(services.cabinet.alerts).not.toHaveBeenCalled()
  })

  describe('filter chips', () => {
    it('lists All, Shortage, Signals, Label and Recalls with their counts, All selected', async () => {
      const w = await show()

      expect(w.findAll('.chips .chip').map((c) => c.text().replace(/\s+/g, ' '))).toEqual(['All 3', 'Shortage 1', 'Signals 1', 'Label 0', 'Recalls 0'])
      expect(w.find('.chips .chip.active').text()).toContain('All')
    })

    it('narrows the rows to the chip and marks it pressed', async () => {
      const w = await show()

      await click(w, '.chips button', 'Signals')

      expect(rowNames(w)).toEqual(['warfarin'])
      expect(w.find('.chips .chip.active').text()).toContain('Signals')
      expect(w.find('.chips .chip.active').attributes('aria-pressed')).toBe('true')
    })

    it('Shortage also keeps a drug that is in shortage without an alert', async () => {
      services.cabinet.alerts.mockResolvedValue([])
      const w = await show()

      await click(w, '.chips button', 'Shortage')

      expect(rowNames(w)).toEqual(['ibuprofen'])
    })

    it('says so when no medicine matches', async () => {
      const w = await show()

      await click(w, '.chips button', 'Recalls')

      expect(w.find('.none').text()).toBe('No medicines match this filter.')
      expect(w.find('.rows').exists()).toBe(false)
    })
  })

  describe('unfollow', () => {
    it('asks first, then removes the row and calls DELETE for that drug', async () => {
      services.cabinet.list.mockResolvedValueOnce([toFollowedDrug(followedDrug), toFollowedDrug(followedDrugNoShortage), warfarin()])
      const w = await show()
      services.cabinet.list.mockResolvedValue([toFollowedDrug(followedDrug), toFollowedDrug(followedDrugNoShortage)])
      const warfarinRow = w.findAll('.rows li')[0]

      await warfarinRow.find('.actions button').trigger('click')
      expect(services.cabinet.unfollow).not.toHaveBeenCalled()
      await warfarinRow.findAll('.confirm button').find((b) => b.text() === 'Unfollow').trigger('click')
      await flushPromises()

      expect(services.cabinet.unfollow).toHaveBeenCalledWith('7')
      expect(rowNames(w)).toEqual(['ibuprofen', 'acetaminophen'])
      expect(w.find('.intro p').text()).toContain('2 medicines followed')
    })

    it('puts the row back and shows a toast when the server refuses', async () => {
      services.cabinet.unfollow.mockRejectedValue(failure())
      const w = await show()
      const first = w.findAll('.rows li')[0]

      await first.find('.actions button').trigger('click')
      await first.findAll('.confirm button').find((b) => b.text() === 'Unfollow').trigger('click')
      await flushPromises()

      expect(rowNames(w)).toEqual(['warfarin', 'ibuprofen', 'acetaminophen'])
      expect(useUiStore().toast.message).toBe('Could not unfollow warfarin. Try again.')
    })
  })

  describe('alerts', () => {
    it('lists them newest first with the drug name', async () => {
      const w = await show()

      expect(w.findAll('.card li .title').map((t) => t.text())).toEqual(['warfarin: New signal', 'ibuprofen: Shortage'])
    })

    it('dismisses one alert: gone at once, DELETE sent for its id', async () => {
      const w = await show()

      await w.findAll('.x')[0].trigger('click')
      await flushPromises()

      expect(services.cabinet.dismiss).toHaveBeenCalledWith('a-1')
      expect(w.findAll('.card li .title').map((t) => t.text())).toEqual(['ibuprofen: Shortage'])
    })

    it('the row of a drug falls back to its shortage status after its alert is dismissed', async () => {
      const w = await show()

      await w.findAll('.x')[0].trigger('click')
      await flushPromises()

      expect(w.findAll('.rows .chip').map((c) => c.text())).toEqual(['Shortage', 'No changes', 'No changes'])
    })

    it('dismisses all after a confirmation', async () => {
      const w = await show()

      await click(w, '.head button', 'Dismiss all')
      expect(services.cabinet.dismissAll).not.toHaveBeenCalled()
      await click(w, '.confirm button', 'Yes, dismiss')

      expect(services.cabinet.dismissAll).toHaveBeenCalledOnce()
      expect(w.text()).toContain('No alerts in the last 30 days.')
    })

    it('brings the alert back and shows a toast when dismissing fails', async () => {
      services.cabinet.dismiss.mockRejectedValue(failure())
      const w = await show()

      await w.findAll('.x')[0].trigger('click')
      await flushPromises()

      expect(w.findAll('.card li')).toHaveLength(2)
      expect(useUiStore().toast.message).toBe('Could not dismiss the alert. Try again.')
    })

    it('brings all alerts back and shows a toast when dismiss all fails', async () => {
      services.cabinet.dismissAll.mockRejectedValue(failure())
      const w = await show()

      await click(w, '.head button', 'Dismiss all')
      await click(w, '.confirm button', 'Yes, dismiss')

      expect(w.findAll('.card li')).toHaveLength(2)
      expect(useUiStore().toast.message).toBe('Could not dismiss the alerts. Try again.')
    })

    it('says there are no alerts when the user has none, and still lists the medicines', async () => {
      services.cabinet.alerts.mockResolvedValue([])
      const w = await show()

      expect(w.text()).toContain('No alerts in the last 30 days.')
      expect(rowNames(w)).toHaveLength(3)
    })
  })

  describe('empty and failing', () => {
    it('invites to follow a medicine when none is followed, with a search box and no chips', async () => {
      services.cabinet.list.mockResolvedValue([])
      services.cabinet.alerts.mockResolvedValue([])
      const w = await show()

      expect(w.find('.empty h2').text()).toBe("You don't follow any medicine yet")
      expect(w.find('.search-stub').exists()).toBe(true)
      expect(w.find('.chips').exists()).toBe(false)
      expect(w.find('.intro p').text()).toBe('0 medicines followed. Click a medicine to open its page.')
    })

    it('shows an error with Retry when nothing could be loaded, and loads again on Retry', async () => {
      services.cabinet.list.mockRejectedValueOnce(failure(503))
      const w = await show()
      expect(w.find('[role="alert"]').text()).toContain('Could not load your medicines.')
      expect(w.find('.rows').exists()).toBe(false)

      await w.find('[role="alert"] button').trigger('click')
      await flushPromises()

      expect(w.find('[role="alert"]').exists()).toBe(false)
      expect(rowNames(w)).toHaveLength(3)
    })

    it('still shows the medicines when only the alerts failed', async () => {
      services.cabinet.alerts.mockRejectedValue(failure())
      const w = await show()

      expect(rowNames(w)).toHaveLength(3)
      expect(w.find('[role="alert"]').exists()).toBe(false)
    })
  })

  it('"Find a drug to follow" focuses the search box of the navbar', async () => {
    const nav = document.createElement('header')
    nav.className = 'nav'
    nav.innerHTML = '<input type="search" />'
    document.body.appendChild(nav)
    const w = await show()

    await click(w, '.intro button', 'Find a drug to follow')

    expect(document.activeElement).toBe(nav.querySelector('input'))
  })

  it('shows the disclaimer', async () => {
    expect((await show()).find('.disclaimer').text()).toContain('voluntary and unverified')
  })
})
