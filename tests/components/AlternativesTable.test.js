import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'
import { alternativesData } from '../helpers/fixtures'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const AlternativesTable = (await import('@/presentation/components/shortages/AlternativesTable.vue')).default

const RouterLink = { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)" @click.prevent><slot /></a>' }
const show = (alternatives = toAlternatives(alternativesData), props = {}) =>
  mount(AlternativesTable, { props: { alternatives, ...props }, global: { stubs: { RouterLink } } })

beforeEach(() => push.mockReset())

describe('AlternativesTable', () => {
  it('lists the ranked rows with every column', () => {
    const w = show()

    const rows = w.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].findAll('td').map((c) => c.text())).toEqual([
      '1', 'ibuprofen 200 MG Oral Tablet', 'Same ingredient', 'TABLET', 'ORAL', '0', 'Low', '12',
    ])
    expect(rows[1].findAll('td').map((c) => c.text())).toEqual([
      '2', 'naproxen', 'Same class', '–', '–', '1', 'Moderate', '8',
    ])
  })

  it('colours the signal profile chip: LOW green, MODERATE amber, HIGH coral', () => {
    const data = toAlternatives(alternativesData)
    data.items[1].signalProfile = 'HIGH'
    const w = show(data)

    const chips = w.findAll('tbody .chip')
    expect(chips[0].classes()).toContain('green')
    expect(chips[1].classes()).toContain('coral')
    expect(chips[1].text()).toBe('High')
  })

  it('says which route and form the alternatives share', () => {
    expect(show().find('.caption').text()).toBe('Same route and form as the drug in shortage: TABLET · ORAL')
  })

  it('leaves out the caption when the backend names no form or route', () => {
    const data = { targetDosageForm: null, targetRoutes: [], items: toAlternatives(alternativesData).items }

    expect(show(data).find('.caption').exists()).toBe(false)
  })

  it('shows the empty state and no table when there are no alternatives', () => {
    const w = show({ targetDosageForm: 'TABLET', targetRoutes: ['ORAL'], items: [] })

    expect(w.text()).toContain('No alternative with the same route and form is available')
    expect(w.find('table').exists()).toBe(false)
  })

  it('opens the drug of a row when the row is clicked', async () => {
    const w = show()

    await w.findAll('tbody tr')[1].trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '7258' } })
  })

  it('links the product name to its drug without a second navigation from the row', async () => {
    const w = show()
    const link = w.findAll('tbody a.link')[1]

    expect(JSON.parse(link.attributes('data-to'))).toEqual({ name: 'drug', params: { rxcui: '7258' } })
    await link.trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('marks the drug itself (other products) and does not navigate to it', async () => {
    const w = show(toAlternatives(alternativesData), { currentRxcui: '310965' })
    const self = w.findAll('tbody tr')[0]

    expect(self.text()).toContain('(this drug, other products)')
    expect(self.find('a').exists()).toBe(false)
    await self.trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('shows an unknown profile as a neutral chip instead of failing', () => {
    const data = toAlternatives(alternativesData)
    data.items[0].signalProfile = undefined
    const w = show(data)

    expect(w.find('tbody .chip').text()).toBe('Unknown')
    expect(w.find('tbody .chip').classes()).toContain('slate')
  })
})
