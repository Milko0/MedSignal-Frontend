import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'
import { toDrug360 } from '@/infrastructure/mappers/drugMapper'
import { toTrendPoint } from '@/infrastructure/mappers/trendMapper'
import { alternativesData, drug360, drug360NoShortage, trendPoint } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const { services } = await import('@/composition/container')
const DrugDetailView = (await import('@/presentation/views/DrugDetailView.vue')).default

const stubs = {
  RouterLink: { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' },
  DrugSearchBox: { template: '<div class="search-stub" />' },
  // Plotly needs a real canvas; the stubs show what the view handed over.
  ReactionBars: { props: ['reactions'], template: '<div class="reaction-bars" :data-count="reactions.length" />' },
  TrendChart: { props: ['series'], template: '<div class="trend-chart" :data-series="series.map((s) => s.reaction).join(\'|\')" />' },
}

let pinia
async function show(rxcui = '5640') {
  const w = mount(DrugDetailView, { props: { rxcui }, global: { plugins: [pinia], stubs } })
  await flushPromises()
  return w
}
const failure = (status) => Object.assign(new Error('boom'), { status })
const deferred = () => {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}
const points = [
  toTrendPoint({ ...trendPoint, month: '2026-01', reaction: 'Nausea', reports: 5 }),
  toTrendPoint({ ...trendPoint, month: '2026-02', reaction: 'Nausea', reports: 7 }),
]

beforeEach(() => {
  vi.resetAllMocks()
  push.mockReset()
  pinia = createPinia()
  setActivePinia(pinia)
  services.auth.hasToken.mockReturnValue(false)
  services.drug.getDrug360.mockResolvedValue(toDrug360(drug360))
  services.drug.getReactionTrend.mockResolvedValue(points)
  services.drug.getAlternatives.mockResolvedValue(toAlternatives(alternativesData))
})

describe('DrugDetailView', () => {
  it('shows a skeleton while the overview loads', async () => {
    services.drug.getDrug360.mockReturnValue(new Promise(() => {}))
    const w = await show()

    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    expect(w.find('h1').exists()).toBe(false)
  })

  it('shows the whole page for a drug in shortage', async () => {
    const w = await show()

    expect(w.find('h1').text()).toBe('ibuprofen')
    expect(w.find('.crumbs').text()).toBe('Search results / ibuprofen')
    expect(w.find('#shortage-title').exists()).toBe(true)
    expect(w.find('#recalls-title').exists()).toBe(true)
    expect(w.find('#label-title').exists()).toBe(true)
    expect(w.find('.reaction-bars').attributes('data-count')).toBe('2')
    expect(w.find('.trend-chart').attributes('data-series')).toBe('Nausea')
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.find('.disclaimer').text()).toContain('voluntary and unverified')
  })

  it('reads the overview once, the 12-month trend once and the alternatives once', async () => {
    await show()

    expect(services.drug.getDrug360).toHaveBeenCalledTimes(1)
    expect(services.drug.getDrug360).toHaveBeenCalledWith('5640', { dosageForm: null, route: null })
    expect(services.drug.getReactionTrend).toHaveBeenCalledWith('5640', 12)
    expect(services.drug.getAlternatives).toHaveBeenCalledTimes(1)
  })

  it('shows no alternatives card and makes no alternatives call when the drug is not in shortage', async () => {
    services.drug.getDrug360.mockResolvedValue(toDrug360(drug360NoShortage))
    const w = await show('161')

    expect(w.find('#alternatives-title').exists()).toBe(false)
    expect(services.drug.getAlternatives).not.toHaveBeenCalled()
    expect(w.find('h1').text()).toBe('acetaminophen')
  })

  it('shows the data-quality line from the match coverage', async () => {
    const w = await show()

    expect(w.find('.quality').text()).toBe('Based on 87% of reports matched to an ingredient.')
  })

  it('says so when a drug has no reactions or no monthly data', async () => {
    services.drug.getDrug360.mockResolvedValue(toDrug360(drug360NoShortage))
    services.drug.getReactionTrend.mockResolvedValue([])
    const w = await show('161')

    expect(w.text()).toContain('No reactions reported for this drug.')
    expect(w.text()).toContain('No monthly data for this drug.')
    expect(w.find('.quality').exists()).toBe(false)
  })

  describe('when the drug does not exist', () => {
    it('shows "We couldn\'t find this drug" with a search box, not a blank page', async () => {
      services.drug.getDrug360.mockRejectedValue(failure(404))
      const w = await show('0000000')

      expect(w.find('h1').text()).toBe("We couldn't find this drug")
      expect(w.find('.search-stub').exists()).toBe(true)
      expect(w.text()).toContain('RxCUI 0000000')
      expect(services.drug.getReactionTrend).not.toHaveBeenCalled()
    })
  })

  describe('when the overview fails', () => {
    it('shows an error with Retry that loads the drug again', async () => {
      services.drug.getDrug360.mockRejectedValueOnce(failure(500))
      const w = await show()
      expect(w.find('[role="alert"]').text()).toContain('Drug details are unavailable')
      expect(w.find('h1').text()).not.toBe('ibuprofen')

      await w.find('[role="alert"] button').trigger('click')
      await flushPromises()

      expect(services.drug.getDrug360).toHaveBeenCalledTimes(2)
      expect(w.find('h1').text()).toBe('ibuprofen')
    })
  })

  describe('when only a section fails', () => {
    it('keeps the page and retries the trend on its own', async () => {
      services.drug.getReactionTrend.mockRejectedValueOnce(failure(500))
      const w = await show()
      expect(w.find('#trend-title').element.parentElement.textContent).toContain('Could not load the monthly trend.')
      expect(w.find('h1').text()).toBe('ibuprofen')
      expect(w.findAll('tbody tr')).toHaveLength(2)

      await w.find('#trend-title').element.parentElement.querySelector('button').click()
      await flushPromises()

      expect(services.drug.getReactionTrend).toHaveBeenCalledTimes(2)
      expect(services.drug.getDrug360).toHaveBeenCalledTimes(1)
      expect(w.find('.trend-chart').exists()).toBe(true)
    })

    it('keeps the page and retries the alternatives on its own', async () => {
      services.drug.getAlternatives.mockRejectedValueOnce(failure(500))
      const w = await show()
      const card = w.find('#alternatives-title').element.parentElement
      expect(card.textContent).toContain('Could not load alternatives.')
      expect(w.find('.trend-chart').exists()).toBe(true)

      card.querySelector('button').click()
      await flushPromises()

      expect(services.drug.getAlternatives).toHaveBeenCalledTimes(2)
      expect(w.findAll('tbody tr')).toHaveLength(2)
    })
  })

  describe('dosage form', () => {
    it('is offered when the shortage covers several forms and re-reads the overview and alternatives on change', async () => {
      const w = await show()
      const select = w.find('select')
      expect(select.exists()).toBe(true)
      expect(select.findAll('option').map((o) => o.text())).toEqual(['All forms', 'TABLET', 'SUSPENSION'])

      await select.setValue('TABLET')
      await flushPromises()

      expect(services.drug.getDrug360).toHaveBeenLastCalledWith('5640', { dosageForm: 'TABLET', route: null })
      expect(services.drug.getAlternatives).toHaveBeenLastCalledWith('5640', { dosageForm: 'TABLET', route: null })
      expect(services.drug.getReactionTrend).toHaveBeenCalledTimes(1)
    })

    it('is not offered for a drug with a single form', async () => {
      const single = toDrug360({ ...drug360, shortage: { ...drug360.shortage, dosage_forms: ['TABLET'] } })
      services.drug.getDrug360.mockResolvedValue(single)
      const w = await show()

      expect(w.find('select').exists()).toBe(false)
    })

    it('stays on screen (dimmed) while it re-reads, and says so', async () => {
      const w = await show()
      const pending = deferred()
      services.drug.getDrug360.mockReturnValue(pending.promise)

      await w.find('select').setValue('TABLET')

      expect(w.find('.body').classes()).toContain('dim')
      expect(w.find('.toolbar').text()).toContain('Updating…')
      expect(w.find('h1').text()).toBe('ibuprofen')
      expect(w.find('select').attributes('disabled')).toBeDefined()
      pending.resolve(toDrug360(drug360))
      await flushPromises()
      expect(w.find('.body').classes()).not.toContain('dim')
    })

    it('says so and keeps the page when the narrowed overview fails', async () => {
      const w = await show()
      services.drug.getDrug360.mockRejectedValue(failure(500))

      await w.find('select').setValue('TABLET')
      await flushPromises()

      expect(w.find('.toolbar [role="alert"]').text()).toBe('Could not apply that form. Try again.')
      expect(w.find('select').element.value).toBe('')
      expect(w.find('h1').text()).toBe('ibuprofen')
    })
  })

  describe('follow', () => {
    it('sends a guest to the login screen that returns to this drug', async () => {
      const w = await show()

      expect(JSON.parse(w.find('a.login').attributes('data-to'))).toEqual({ name: 'login', query: { redirect: '/drugs/5640' } })
      expect(w.find('button.btn').exists()).toBe(false)
    })

    it('lets a user unfollow, flipping the button', async () => {
      services.auth.hasToken.mockReturnValue(true)
      services.cabinet.unfollow.mockResolvedValue(undefined)
      services.cabinet.list.mockResolvedValue([])
      const w = await show()
      const button = () => w.find('.follow button')
      expect(button().text()).toBe('Following')

      await button().trigger('click')
      await flushPromises()

      expect(services.cabinet.unfollow).toHaveBeenCalledWith('5640')
      expect(button().text()).toBe('Follow')
    })

    it('flips back and says so when the server refuses', async () => {
      services.auth.hasToken.mockReturnValue(true)
      services.cabinet.unfollow.mockRejectedValue(failure(500))
      const w = await show()

      await w.find('.follow button').trigger('click')
      await flushPromises()

      expect(w.find('.follow button').text()).toBe('Following')
      expect(w.find('.follow [role="alert"]').text()).toBe('Could not update. Try again.')
    })
  })

  describe('route change', () => {
    it('loads the new drug and drops the old one when the rxcui changes', async () => {
      const w = await show('5640')
      services.drug.getDrug360.mockResolvedValue(toDrug360(drug360NoShortage))

      await w.setProps({ rxcui: '161' })
      await flushPromises()

      expect(services.drug.getDrug360).toHaveBeenLastCalledWith('161', { dosageForm: null, route: null })
      expect(w.find('h1').text()).toBe('acetaminophen')
      expect(w.find('#alternatives-title').exists()).toBe(false)
    })

    it('shows the skeleton, not the old drug, while the new one loads', async () => {
      const w = await show('5640')
      services.drug.getDrug360.mockReturnValue(new Promise(() => {}))

      await w.setProps({ rxcui: '161' })

      expect(w.find('[aria-busy="true"]').exists()).toBe(true)
      expect(w.find('h1').exists()).toBe(false)
    })
  })
})
