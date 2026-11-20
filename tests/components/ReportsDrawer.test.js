import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReportsDrawer from '@/presentation/components/signals/ReportsDrawer.vue'
import { toReportBrief } from '@/infrastructure/mappers/reportMapper'
import { reportBrief } from '../helpers/fixtures'

const drawer = (over = {}) => ({
  open: true, rxcui: '5640', drug: 'IBUPROFEN', reaction: 'NAUSEA', page: 1, pageSize: 10,
  items: [toReportBrief(reportBrief)], total: 1, totalPages: 1, loading: false, error: null, unavailable: false, ...over,
})
const show = (over = {}) => mount(ReportsDrawer, { props: { drawer: drawer(over) }, attachTo: document.body })

describe('ReportsDrawer', () => {
  it('renders nothing while closed', () => {
    expect(show({ open: false }).find('[role="dialog"]').exists()).toBe(false)
  })

  it('titles the panel with the drug and the reaction and counts the reports', () => {
    const w = show({ total: 41 })

    expect(w.find('#reports-title').text()).toBe('Reports: IBUPROFEN and NAUSEA')
    expect(w.find('.count').text()).toBe('41 reports')
    expect(w.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(w.find('[role="dialog"]').attributes('aria-labelledby')).toBe('reports-title')
  })

  it('shows date, seriousness, age, sex, country, reactions and suspect drugs of a report', () => {
    const w = show()
    const r = w.find('.report')

    expect(r.find('.top strong').text()).toBe('14 Jul 2026')
    expect(r.find('.chip').text()).toBe('Serious')
    expect(r.find('.chip').classes()).toContain('coral')
    expect(r.text()).toContain('Report 10234567')
    const rows = Object.fromEntries([...r.findAll('dt')].map((dt, i) => [dt.text(), r.findAll('dd')[i].text()]))
    expect(rows).toEqual({ Age: '65-74', Sex: 'Female', Country: 'US', Reactions: 'Gastrointestinal haemorrhageAnaemia', 'Suspect drugs': 'IBUPROFEN' })
    expect(r.findAll('.tags')[0].findAll('li')).toHaveLength(2)
  })

  it('writes UNKNOWN enums and missing values as "Unknown" and shows non-serious / unknown seriousness', () => {
    const w = show({
      items: [
        toReportBrief({ ...reportBrief, report_id: '1', age_group: 'UNKNOWN', sex: 'UNKNOWN', country: null, serious: false }),
        toReportBrief({ ...reportBrief, report_id: '2', serious: null, receive_date: null }),
      ],
      total: 2,
    })
    const [a, b] = w.findAll('.report')

    expect(a.findAll('dd').slice(0, 3).map((d) => d.text())).toEqual(['Unknown', 'Unknown', 'Unknown'])
    expect(a.find('.chip').text()).toBe('Not serious')
    expect(b.find('.chip').text()).toBe('Seriousness unknown')
    expect(b.find('.top strong').text()).toBe('Date unknown')
  })

  it('closes with the button, the backdrop and Escape', async () => {
    const w = show()

    await w.find('.close').trigger('click')
    await w.find('.backdrop').trigger('click')
    await w.find('.overlay').trigger('keydown', { key: 'Escape' })

    expect(w.emitted('close')).toHaveLength(3)
  })

  it('moves focus into the panel when it opens and back to the opener when it closes', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const w = mount(ReportsDrawer, { props: { drawer: drawer({ open: false }) }, attachTo: document.body })

    await w.setProps({ drawer: drawer() })
    await nextTick()
    expect(document.activeElement).toBe(w.find('[role="dialog"]').element)

    await w.setProps({ drawer: drawer({ open: false }) })
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  describe('pagination', () => {
    it('emits the previous and next page, disabled at the ends', async () => {
      const middle = show({ page: 2, totalPages: 5, total: 50 })
      await middle.findAll('.pager button')[0].trigger('click')
      await middle.findAll('.pager button')[1].trigger('click')
      expect(middle.emitted('page')).toEqual([[1], [3]])
      expect(middle.find('.pager').text()).toContain('Page 2 of 5')

      const first = show({ page: 1, totalPages: 5 })
      expect(first.findAll('.pager button')[0].attributes('disabled')).toBeDefined()
      const last = show({ page: 5, totalPages: 5 })
      expect(last.findAll('.pager button')[1].attributes('disabled')).toBeDefined()
    })

    it('has no pager for a single page, and disables it while loading', () => {
      expect(show({ totalPages: 1 }).find('.pager').exists()).toBe(false)
      expect(show({ page: 2, totalPages: 5, loading: true }).findAll('.pager button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    })
  })

  describe('states', () => {
    it('loading', () => {
      expect(show({ loading: true, items: [], total: 0 }).find('.count').text()).toBe('Loading…')
    })

    it('error with Retry for the same page', async () => {
      const w = show({ error: new Error('boom'), items: [], page: 3 })
      expect(w.find('[role="alert"]').text()).toContain('Could not load the reports.')

      await w.find('[role="alert"] button').trigger('click')

      expect(w.emitted('page')).toEqual([[3]])
    })

    it('unavailable because of a "/" in the reaction names the cause (backend request B2)', () => {
      const w = show({ unavailable: true, reaction: 'OEDEMA/EFFUSION', items: [] })

      expect(w.find('.state').text()).toContain('its name contains a "/"')
    })

    it('unavailable for another reason says no reports were found', () => {
      expect(show({ unavailable: true, items: [] }).find('.state').text()).toBe('No reports were found for this signal.')
    })

    it('empty list', () => {
      expect(show({ items: [], total: 0 }).find('.state').text()).toBe('No reports to show.')
    })
  })

  it('shows the disclaimer', () => {
    expect(show().find('.disclaimer').text()).toContain('voluntary and unverified')
  })
})
