import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { toSignalList } from '@/infrastructure/mappers/signalMapper'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'
import { toPage } from '@/infrastructure/mappers/commonMapper'
import { toReportBrief } from '@/infrastructure/mappers/reportMapper'
import { DISCLAIMER_TEXT, labelGapsData, signalList, signalReports } from '../helpers/fixtures'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const SignalsView = (await import('@/presentation/views/SignalsView.vue')).default

const stubs = {
  RouterLink: { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' },
  DrugSearchBox: { emits: ['select'], template: '<div class="picker-stub" />' },
  // Plotly needs a real canvas; the stubs show what the view handed to each chart.
  AgeBarChart: { props: ['groups'], template: '<div class="age-chart" :data-groups="JSON.stringify(groups)" />' },
  DonutChart: { props: ['values'], template: '<div class="sex-chart" :data-values="JSON.stringify(values)" />' },
  TrendChart: { props: ['series'], template: '<div class="serious-chart" :data-series="JSON.stringify(series)" />' },
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
    expect(field(w, 'Description').find('input').element.value).toBe('nausea')
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
    await field(w, 'Description').find('input').setValue('headache')
    await field(w, 'Minimum reports').find('select').setValue('5')

    await apply(w)

    expect(router.currentRoute.value.query).toEqual({ reaction: 'headache', min: '5' })
    expect(lastList()).toMatchObject({ reaction: 'headache', minReports: 5, page: 1 })
  })

  it('does not load anything while a filter is only edited, only on Apply', async () => {
    const w = await open('/signals')
    services.signal.list.mockClear()

    await field(w, 'Description').find('input').setValue('headache')
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
    await field(w, 'Description').find('input').setValue('headache')
    await apply(w)
    expect(field(w, 'Description').find('input').element.value).toBe('headache')

    router.back()
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(field(w, 'Description').find('input').element.value).toBe('')
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

describe('SignalsView: the table', () => {
  it('shows a row per signal with its label state and pager, without the PRR', async () => {
    const w = await open('/signals')

    expect(w.findAll('tbody tr')).toHaveLength(1)
    expect(w.find('tbody tr').text()).toContain('ibuprofen')
    expect(w.find('tbody tr').text()).toContain('Listed')
    expect(w.find('tbody tr').text()).not.toContain('4.9')
    expect(w.find('.pager').text()).toContain('Page 2 of 5')
  })

  it('goes to the next page through the URL and asks the backend for it', async () => {
    const w = await open('/signals?page=2')

    await w.findAll('.pager button')[1].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ page: '3' })
    expect(lastList().page).toBe(3)
  })

  it('keeps the other filters when the page changes', async () => {
    const w = await open('/signals?rxcui=5640&drug=IBUPROFEN&reaction=nausea&page=2')

    await w.findAll('.pager button')[0].trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ rxcui: '5640', drug: 'IBUPROFEN', reaction: 'nausea' })
  })

  it('shows a loading line before the first answer and the rows after', async () => {
    services.signal.list.mockReturnValue(new Promise(() => {}))
    const w = await open('/signals')

    expect(w.find('[role="status"]').text()).toBe('Loading…')
    expect(w.find('table').exists()).toBe(false)
  })

  it('shows an error with Retry that loads again', async () => {
    services.signal.list.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
    const w = await open('/signals')
    expect(w.find('[role="alert"]').text()).toContain('Could not load signals.')

    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(services.signal.list).toHaveBeenCalledTimes(2)
    expect(w.find('[role="alert"]').exists()).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(1)
  })

  it('says why nothing matches, naming the quarter and the minimum', async () => {
    services.signal.list.mockResolvedValue(list({ items: [], total: 0, total_pages: 0 }))
    const w = await open('/signals')

    expect(w.find('.results').text()).toBe('No signals in 2026Q3 with at least 20 reports. Try a lower minimum or "Show all pairs".')
    expect(w.find('table').exists()).toBe(false)
  })

  it('offers page 1 when the URL asks for a page past the end', async () => {
    services.signal.list.mockResolvedValue(list({ items: [], total: 41, page: 99, total_pages: 5 }))
    const w = await open('/signals?page=99')
    expect(w.find('.results').text()).toContain('Page 99 is past the last page (5)')

    await w.find('.results button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
  })
})

describe('SignalsView: Emerging and Label gaps tabs', () => {
  it('Emerging: shows the same kind of table from /signals/emerging, with the quarter of the response', async () => {
    services.signal.emerging.mockResolvedValue(list({ quarter: '2026Q3', total: 1630 }))
    const w = await open('/signals?tab=emerging')

    expect(w.findAll('tbody tr')).toHaveLength(1)
    expect(w.find('.summary').text()).toContain('Quarter: 2026Q3 (latest)')
    expect(w.find('.summary').text()).toContain('1630 pairs')
  })

  it('Emerging: names emerging signals and the minimum of 3 when there are none', async () => {
    services.signal.emerging.mockResolvedValue(list({ items: [], total: 0, total_pages: 0 }))
    const w = await open('/signals?tab=emerging')

    expect(w.find('.results').text()).toBe('No emerging signals in 2026Q3 with at least 3 reports.')
  })

  it('Label gaps without a drug: asks to choose one and sends no request', async () => {
    const w = await open('/signals?tab=gaps')

    expect(w.find('.results').text()).toBe('Choose a drug to see its label gaps.')
    expect(services.drug.getLabelGaps).not.toHaveBeenCalled()
    expect(services.signal.list).not.toHaveBeenCalled()
    expect(w.find('.picker-stub').exists()).toBe(true)
  })

  it('Label gaps with a drug: asks /drugs/{rxcui}/label-gaps and shows the table under the drug name', async () => {
    const w = await open('/signals?tab=gaps&rxcui=5640&drug=IBUPROFEN&min=5')

    expect(services.drug.getLabelGaps).toHaveBeenCalledWith('5640', 5)
    expect(w.find('.gaps-title').text()).toBe('Label gaps for IBUPROFEN')
    expect(JSON.parse(w.find('.gaps-title a').attributes('data-to'))).toEqual({ name: 'drug', params: { rxcui: '5640' } })
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.find('.summary').exists()).toBe(false)
  })

  it('Label gaps: picking a drug in the filter and applying loads its gaps', async () => {
    const w = await open('/signals?tab=gaps')

    w.findComponent('.picker-stub').vm.$emit('select', { rxcui: '700810', name: 'LISDEXAMFETAMINE' })
    await flushPromises()
    await apply(w)

    expect(router.currentRoute.value.query).toEqual({ tab: 'gaps', rxcui: '700810', drug: 'LISDEXAMFETAMINE' })
    expect(services.drug.getLabelGaps).toHaveBeenCalledWith('700810', 20)
  })

  it('Label gaps: shows the OTC-only message', async () => {
    services.drug.getLabelGaps.mockResolvedValue({ ...toLabelGaps({ ...labelGapsData, comparable: false, gaps: [] }), disclaimer: DISCLAIMER_TEXT })
    const w = await open('/signals?tab=gaps&rxcui=5640')

    expect(w.find('.results').text()).toContain('Only OTC labels exist, which have no adverse reactions section')
  })

  it('Label gaps: shows an error with Retry', async () => {
    services.drug.getLabelGaps.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 404 }))
    const w = await open('/signals?tab=gaps&rxcui=5640')
    expect(w.find('[role="alert"]').text()).toContain('Could not load the label gaps.')

    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(w.findAll('tbody tr')).toHaveLength(2)
  })

  it('Label gaps: shows the disclaimer of the label-gaps response', async () => {
    services.drug.getLabelGaps.mockResolvedValue({ ...toLabelGaps(labelGapsData), disclaimer: 'Gap disclaimer.' })
    const w = await open('/signals?tab=gaps&rxcui=5640')

    expect(w.find('.disclaimer').text()).toBe('Gap disclaimer.')
  })
})

describe('SignalsView: reports drawer', () => {
  beforeEach(() => { services.signal.reports.mockResolvedValue(toPage(signalReports, toReportBrief)) })

  it('"View reports" opens the drawer for that row and loads its reports', async () => {
    const w = await open('/signals')

    await w.find('button.reports').trigger('click')
    await flushPromises()

    expect(services.signal.reports).toHaveBeenCalledWith('5640', 'Gastrointestinal haemorrhage', { page: 1, pageSize: 10 })
    expect(w.find('[role="dialog"]').exists()).toBe(true)
    expect(w.find('#reports-title').text()).toBe('Reports: ibuprofen and Gastrointestinal haemorrhage')
    expect(w.findAll('.report')).toHaveLength(1)
  })

  it('pages through the reports without touching the table or the URL', async () => {
    services.signal.reports.mockResolvedValue(toPage({ ...signalReports, total: 25, total_pages: 3 }, toReportBrief))
    const w = await open('/signals')
    await w.find('button.reports').trigger('click')
    await flushPromises()
    services.signal.list.mockClear()

    await w.findAll('[aria-label="Report pages"] button')[1].trigger('click')
    await flushPromises()

    expect(services.signal.reports).toHaveBeenLastCalledWith('5640', 'Gastrointestinal haemorrhage', { page: 2, pageSize: 10 })
    expect(services.signal.list).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('closes with Escape and when the filters change', async () => {
    const w = await open('/signals')
    await w.find('button.reports').trigger('click')
    await flushPromises()
    await w.find('.overlay').trigger('keydown', { key: 'Escape' })
    expect(w.find('[role="dialog"]').exists()).toBe(false)

    await w.find('button.reports').trigger('click')
    await flushPromises()
    router.push({ query: { reaction: 'nausea' } })
    await flushPromises()
    expect(w.find('[role="dialog"]').exists()).toBe(false)
  })

  it('shows "unavailable" for a reaction the backend cannot route (a "/")', async () => {
    services.signal.list.mockResolvedValue(list({ items: [{ ...signalList.items[0], reaction: 'OEDEMA/EFFUSION' }] }))
    services.signal.reports.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }))
    const w = await open('/signals')

    await w.find('button.reports').trigger('click')
    await flushPromises()

    expect(w.find('.panel .state').text()).toContain('its name contains a "/"')
  })
})

describe('SignalsView: statistics charts', () => {
  const stat = (group_by, buckets) => toStatistics({ group_by, buckets })
  const QUARTER_BUCKETS = [{ group: '2026Q2', value: 22608 }, { group: '2026Q3', value: 19520 }]
  function backend(broken = () => false) {
    services.signal.statistics.mockImplementation(async (p) => {
      if (broken(p)) throw Object.assign(new Error('boom'), { status: 500 })
      if (p.groupBy === 'quarter') return stat('quarter', QUARTER_BUCKETS)
      if (p.groupBy === 'age_group') return stat('age_group', [{ group: 'UNKNOWN', value: 3 }, { group: '75+', value: 2 }, { group: '0-17', value: 1 }])
      if (p.groupBy === 'sex') return stat('sex', [{ group: 'FEMALE', value: 3 }, { group: 'MALE', value: 1 }])
      return stat('seriousness', [{ group: 'SERIOUS', value: p.quarter === '2026Q3' ? 10806 : 12700 }])
    })
  }
  const data = (w, sel, attr) => JSON.parse(w.find(sel).attributes(attr))

  it('draws the three charts from the statistics, not from sample data', async () => {
    backend()
    const w = await open('/signals')

    expect(Object.keys(data(w, '.age-chart', 'data-groups'))).toEqual(['0-17', '75+'])
    expect(data(w, '.sex-chart', 'data-values')).toEqual({ Female: 75, Male: 25 })
    const series = data(w, '.serious-chart', 'data-series')
    expect(series.map((x) => x.reaction)).toEqual(['All reports', 'Serious'])
    expect(series[1].counts).toEqual([12700, 10806])
    expect(w.text()).not.toContain('(sample)')
  })

  it('leaves Unknown out of the charts and says under the chart how many reports have it blank', async () => {
    backend()
    const w = await open('/signals')

    const notes = w.findAll('.footnote').map((n) => n.text())
    expect(notes).toEqual(['50% of reports have no age recorded; the chart shows the rest.'])   // 3 of 6; sex has no Unknown
  })

  it('says what the charts describe: the latest quarter of all drugs by default', async () => {
    backend()
    const w = await open('/signals')

    expect(w.findAll('.stats .note').map((n) => n.text())).toEqual(['all drugs · 2026Q3', 'all drugs · 2026Q3', 'all drugs · last 6 quarters'])
  })

  it('describes the drug and quarter of the table when they are chosen', async () => {
    backend()
    const w = await open('/signals?rxcui=5640&drug=IBUPROFEN&quarter=2026Q2')

    expect(w.findAll('.stats .note').map((n) => n.text())).toEqual(['IBUPROFEN · 2026Q2', 'IBUPROFEN · 2026Q2', 'IBUPROFEN · last 6 quarters'])
    expect(services.signal.statistics).toHaveBeenCalledWith({ rxcui: '5640', groupBy: 'age_group', quarter: '2026Q2' })
  })

  it('redraws for the new drug after Apply, but not when only the page changes', async () => {
    backend()
    const w = await open('/signals')
    services.signal.statistics.mockClear()

    await w.findAll('.pager button')[1].trigger('click')
    await flushPromises()
    expect(services.signal.statistics).not.toHaveBeenCalled()

    router.push({ query: { rxcui: '5640', drug: 'IBUPROFEN' } })
    await flushPromises()
    expect(services.signal.statistics).toHaveBeenCalledWith({ rxcui: '5640', groupBy: 'age_group', quarter: '2026Q3' })
    expect(w.find('.stats .note').text()).toBe('IBUPROFEN · 2026Q3')
  })

  it('a chart that fails shows its own error and Retry; the other charts and the table stay', async () => {
    let failAge = true
    backend((p) => failAge && p.groupBy === 'age_group')
    const w = await open('/signals')
    const card = w.find('section[aria-label="Reports by age group"]')
    expect(card.find('[role="alert"]').text()).toContain('Could not load this chart.')
    expect(w.find('.sex-chart').exists()).toBe(true)
    expect(w.find('.serious-chart').exists()).toBe(true)
    expect(w.findAll('tbody tr')).toHaveLength(1)

    failAge = false
    await card.find('[role="alert"] button').trigger('click')
    await flushPromises()

    expect(w.find('.age-chart').exists()).toBe(true)
  })

  it('says there are no reports instead of an empty chart for a drug without any', async () => {
    services.signal.statistics.mockImplementation(async (p) => stat(p.groupBy, p.groupBy === 'quarter' ? QUARTER_BUCKETS : []))
    const w = await open('/signals?rxcui=1')

    expect(w.find('section[aria-label="Reports by age group"]').text()).toContain('No reports for this selection.')
    expect(w.find('.age-chart').exists()).toBe(false)
  })

  it('Apply on unchanged filters reloads the charts too', async () => {
    backend()
    const w = await open('/signals')
    services.signal.statistics.mockClear()

    await apply(w)

    expect(services.signal.statistics).toHaveBeenCalledWith({ rxcui: null, groupBy: 'age_group', quarter: '2026Q3' })
  })

  it('also shows the charts on the Emerging and Label gaps tabs', async () => {
    backend()
    const emerging = await open('/signals?tab=emerging&quarter=2026Q2')
    expect(emerging.find('.stats .note').text()).toBe('all drugs · 2026Q2')

    const gaps = await open('/signals?tab=gaps&rxcui=5640&drug=IBUPROFEN')
    expect(gaps.find('.stats .note').text()).toBe('IBUPROFEN · all quarters')
  })
})


describe("SignalsView: the user's own minimum reports (alert settings)", () => {
  const mine = (minReports) => ({ newSignal: true, labelUpdated: true, shortageChanged: true, newRecall: true, minReports })
  const loggedIn = (minReports = 50) => {
    services.auth.hasToken.mockReturnValue(true)
    services.profile.getAlertSettings.mockResolvedValue(mine(minReports))
  }

  it('a logged-in user with a minimum of 50 opens /signals with 50, in one request, and the URL stays clean', async () => {
    loggedIn()
    const w = await open('/signals')

    expect(services.profile.getAlertSettings).toHaveBeenCalledOnce()
    expect(services.signal.list).toHaveBeenCalledOnce()
    expect(lastList().minReports).toBe(50)
    expect(field(w, 'Minimum reports').find('select').element.value).toBe('50')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('a min in the URL wins over the setting', async () => {
    loggedIn()
    await open('/signals?min=5')
    expect(lastList().minReports).toBe(5)
  })

  it('the Emerging tab keeps its own 3', async () => {
    loggedIn()
    await open('/signals?tab=emerging')
    expect(services.signal.emerging.mock.lastCall[0].minReports).toBe(3)
  })

  it('the Label gaps tab uses the setting', async () => {
    loggedIn()
    await open('/signals?tab=gaps&rxcui=5640')
    expect(services.drug.getLabelGaps).toHaveBeenCalledWith('5640', 50)
  })

  it('choosing 20 explicitly is kept in the URL, because it is not the default of this user', async () => {
    loggedIn()
    const w = await open('/signals')
    await field(w, 'Minimum reports').find('select').setValue('20')
    await apply(w)

    expect(router.currentRoute.value.query).toEqual({ min: '20' })
    expect(lastList().minReports).toBe(20)
  })

  it('"Reset" goes back to the setting of the user', async () => {
    loggedIn()
    const w = await open('/signals?min=5&reaction=nausea')
    await w.findAll('button').find((b) => b.text() === 'Reset').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({})
    expect(lastList().minReports).toBe(50)
  })

  it('a guest does not read the settings and gets 20', async () => {
    await open('/signals')
    expect(services.profile.getAlertSettings).not.toHaveBeenCalled()
    expect(lastList().minReports).toBe(20)
  })

  it('when the settings cannot be read the usual 20 applies and the page still loads', async () => {
    services.auth.hasToken.mockReturnValue(true)
    services.profile.getAlertSettings.mockRejectedValue(new Error('boom'))
    await open('/signals')

    expect(services.signal.list).toHaveBeenCalledOnce()
    expect(lastList().minReports).toBe(20)
  })

  it('settings the user already loaded (profile page) are used at once, without another read', async () => {
    loggedIn(10)
    pinia = createPinia(); setActivePinia(pinia)
    const { useProfileStore } = await import('@/application/stores/useProfileStore')
    await useProfileStore().load()
    services.profile.getAlertSettings.mockClear()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/signals', name: 'signals', component: SignalsView }, { path: '/', component: { template: '<div />' } }],
    })
    await router.push('/signals')
    await router.isReady()
    mount(SignalsView, { global: { plugins: [pinia, router], stubs } })
    await flushPromises()

    expect(services.profile.getAlertSettings).not.toHaveBeenCalled()
    expect(lastList().minReports).toBe(10)
  })
})
