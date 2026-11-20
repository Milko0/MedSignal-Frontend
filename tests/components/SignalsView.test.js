import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'
import { DISCLAIMER_TEXT, labelGapsData, signalList } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const SignalsView = (await import('@/presentation/views/SignalsView.vue')).default

const stubs = {
  RouterLink: { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' },
  DrugSearchBox: { emits: ['select'], template: '<div class="picker-stub" />' },
  AgeBarChart: true, DonutChart: true, TrendChart: true,
}

let pinia, router
const list = (over = {}) => ({ ...toSignalList({ ...signalList, ...over }), disclaimer: DISCLAIMER_TEXT })

async function open(url) {
  pinia = createPinia(); setActivePinia(pinia)
  router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/signals', name: 'signals', component: SignalsView }, { path: '/', component: { template: '<div />' } }],
  })
  await router.push(url)
  await router.isReady()
  const w = mount(SignalsView, { global: { plugins: [pinia, router], stubs } })
  await flushPromises()
  return w
}
const apply = async (w) => { await w.find('form').trigger('submit'); await flushPromises() }
const field = (w, label) => w.findAll('.field').find((f) => f.find('label, .label')?.text() === label)
const lastList = () => services.signal.list.mock.lastCall[0]

beforeEach(() => {
  vi.resetAllMocks()
  services.signal.list.mockResolvedValue(list())
  services.signal.emerging.mockResolvedValue(list())
  services.drug.getLabelGaps.mockResolvedValue({ ...toLabelGaps(labelGapsData), disclaimer: DISCLAIMER_TEXT })
  services.signal.statistics.mockResolvedValue(toStatistics({
    group_by: 'quarter', buckets: [{ group: '2026Q2', value: 1 }, { group: '2026Q3', value: 2 }],
  }))
})

describe('SignalsView: the URL is the source of truth', () => {
  it('opens /signals with the defaults: all tab, latest quarter, minimum 20, only signals, page 1', async () => {
    await open('/signals')

    expect(services.signal.list).toHaveBeenCalledOnce()
    expect(lastList()).toEqual({ quarter: null, rxcui: null, reaction: '', minReports: 20, onlySignals: true, page: 1, pageSize: 10 })
  })

  it('restores every filter from a copied URL', async () => {
    const w = await open('/signals?rxcui=5640&drug=IBUPROFEN&reaction=nausea&quarter=2026Q2&min=50&all=1&page=3')

    expect(lastList()).toEqual({ quarter: '2026Q2', rxcui: '5640', reaction: 'nausea', minReports: 50, onlySignals: false, page: 3, pageSize: 10 })
    expect(w.find('.pill').text()).toBe('IBUPROFEN')
    expect(field(w, 'Reaction').find('input').element.value).toBe('nausea')
    expect(field(w, 'Quarter').find('select').element.value).toBe('2026Q2')
    expect(field(w, 'Minimum reports').find('select').element.value).toBe('50')
    expect(w.find('.toggle input').element.checked).toBe(true)
  })

  it('opens the link the dashboard builds for a row (rxcui + reaction, no tab)', async () => {
    const w = await open('/signals?rxcui=2878&reaction=FACET%20JOINT%20SYNDROME')

    expect(lastList()).toMatchObject({ rxcui: '2878', reaction: 'FACET JOINT SYNDROME' })
    expect(w.find('.pill').text()).toBe('RxCUI 2878')
  })

  it('opens the Emerging tab from the dashboard link with its own default minimum of 3', async () => {
    const w = await open('/signals?tab=emerging')

    expect(services.signal.emerging).toHaveBeenCalledWith({ quarter: null, minReports: 3, page: 1, pageSize: 10 })
    expect(services.signal.list).not.toHaveBeenCalled()
    expect(w.find('[role="tab"][aria-selected="true"]').text()).toBe('Emerging')
  })

  it('falls back to the defaults for nonsense in the URL', async () => {
    await open('/signals?tab=zzz&quarter=2026Q9&min=-4&page=abc&all=maybe')

    expect(lastList()).toEqual({ quarter: null, rxcui: null, reaction: '', minReports: 20, onlySignals: true, page: 1, pageSize: 10 })
  })

  it('Apply writes the filters to the URL, resets to page 1 and loads', async () => {
    const w = await open('/signals?page=4')
    await field(w, 'Reaction').find('input').setValue('headache')
    await field(w, 'Minimum reports').find('select').setValue('5')

    await apply(w)

    expect(router.currentRoute.value.query).toEqual({ reaction: 'headache', min: '5' })
    expect(lastList()).toMatchObject({ reaction: 'headache', minReports: 5, page: 1 })
  })

  it('does not load anything while a filter is only edited, only on Apply', async () => {
    const w = await open('/signals')
    services.signal.list.mockClear()

    await field(w, 'Reaction').find('input').setValue('headache')
    await field(w, 'Quarter').find('select').setValue('2026Q2')

    expect(services.signal.list).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('Apply on unchanged filters reloads the data', async () => {
    const w = await open('/signals')

    await apply(w)

    expect(services.signal.list).toHaveBeenCalledTimes(2)
  })

  it('switching tab changes the URL, drops the page and asks the other endpoint', async () => {
    const w = await open('/signals?page=3&reaction=nausea')

    await w.findAll('[role="tab"]')[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ tab: 'emerging' })
    expect(services.signal.emerging).toHaveBeenCalledWith({ quarter: null, minReports: 3, page: 1, pageSize: 10 })
  })

  it('switching back to All brings the default minimum of 20 back', async () => {
    const w = await open('/signals?tab=emerging')

    await w.findAll('[role="tab"]')[0].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(lastList().minReports).toBe(20)
  })

  it('Reset clears the filters but stays on the tab', async () => {
    const w = await open('/signals?tab=emerging&quarter=2026Q2&min=10')

    await w.findAll('button').find((b) => b.text() === 'Reset').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ tab: 'emerging' })
    expect(services.signal.emerging).toHaveBeenLastCalledWith({ quarter: null, minReports: 3, page: 1, pageSize: 10 })
  })

  it('browser back restores the previous filters in the bar and in the request', async () => {
    const w = await open('/signals')
    await field(w, 'Reaction').find('input').setValue('headache')
    await apply(w)
    expect(field(w, 'Reaction').find('input').element.value).toBe('headache')

    router.back()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(field(w, 'Reaction').find('input').element.value).toBe('')
    expect(lastList().reaction).toBe('')
  })

  it('lists the quarters from the statistics in the quarter select', async () => {
    const w = await open('/signals')

    expect(services.signal.statistics).toHaveBeenCalledWith({ groupBy: 'quarter' })
    expect(field(w, 'Quarter').findAll('option').map((o) => o.text())).toEqual(['Latest', '2026Q3', '2026Q2'])
  })

  it('shows the quarter the backend used, marked "(latest)" when none was chosen', async () => {
    const w = await open('/signals')
    expect(w.find('.summary').text()).toContain('Quarter: 2026Q3 (latest)')

    services.signal.list.mockResolvedValue(list({ quarter: '2026Q2' }))
    await field(w, 'Quarter').find('select').setValue('2026Q2')
    await apply(w)
    expect(w.find('.summary').text()).toContain('Quarter: 2026Q2')
    expect(w.find('.summary').text()).not.toContain('(latest)')
  })

  it('shows the pair count and the data-quality note', async () => {
    const w = await open('/signals')

    expect(w.find('.summary').text()).toContain('41 pairs')
    expect(w.find('.summary').text()).toContain('based on 87% of reports matched to an ingredient')
  })

  it('shows the disclaimer of the response', async () => {
    services.signal.list.mockResolvedValue({ ...list(), disclaimer: 'Custom disclaimer.' })
    const w = await open('/signals')

    expect(w.find('.disclaimer').text()).toBe('Custom disclaimer.')
  })
})
