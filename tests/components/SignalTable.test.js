import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SignalTable from '@/presentation/components/signals/SignalTable.vue'
import PRRBadge from '@/presentation/components/signals/PRRBadge.vue'
import LabelGapChip from '@/presentation/components/signals/LabelGapChip.vue'
import SignalGlossary from '@/presentation/components/signals/SignalGlossary.vue'
import { labelMatchTone, severityTone } from '@/domain/rules/signalSeverity'
import { toSignal } from '@/infrastructure/mappers/signalMapper'
import { signalRow } from '../helpers/fixtures'

const RouterLink = { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' }
const row = (over = {}) => toSignal({ ...signalRow, ...over })
const three = () => [
  row({ rxcui: '1', drug: 'BRAVO', reaction: 'NAUSEA', reports: 30, prr: 2.5, ci_lower: 1.1, chi_square: 20 }),
  row({ rxcui: '2', drug: 'ALPHA', reaction: 'RASH', reports: 90, prr: 6.1, ci_lower: 3.3, chi_square: 90, is_emerging: true, label_match: 'NONE' }),
  row({ rxcui: '3', drug: 'CHARLIE', reaction: 'ITCH', reports: 50, prr: 1.4, ci_lower: 0.9, chi_square: 5, label_match: 'PARTIAL' }),
]
const show = (props = {}) => mount(SignalTable, { props: { signals: three(), total: 3, page: 1, totalPages: 1, ...props }, global: { stubs: { RouterLink } } })
const col = (w, i) => w.findAll('tbody tr').map((r) => r.findAll('td')[i].text())

describe('SignalTable', () => {
  it('renders one row per signal in plain terms, without PRR, CI or chi-square', () => {
    const w = show({ signals: [row()] })
    const cells = w.findAll('tbody td').map((c) => c.text())

    expect(w.findAll('thead th').map((h) => h.text())).toEqual(['Drug', 'Reaction', 'Reports', 'In label', 'Trend', 'Reports'])
    expect(cells.slice(0, 3)).toEqual(['ibuprofen', 'Gastrointestinal haemorrhage', '1204'])
    expect(w.find('tbody .badge').exists()).toBe(false)
    expect(w.text()).not.toContain('4.9')
    expect(cells[3]).toBe('Listed')
    expect(w.find('td svg.sparkline').exists()).toBe(true)
    expect(w.find('tbody button.reports').text()).toBe('View reports')
  })

  it('links the drug to its Drug 360 page', () => {
    const w = show({ signals: [row()] })

    expect(JSON.parse(w.find('tbody a.link').attributes('data-to'))).toEqual({ name: 'drug', params: { rxcui: '5640' } })
  })

  it('emits view-reports with the row of the button clicked', async () => {
    const w = show()

    await w.findAll('button.reports')[1].trigger('click')

    expect(w.emitted('view-reports')).toHaveLength(1)
    expect(w.emitted('view-reports')[0][0]).toMatchObject({ rxcui: '2', reaction: 'RASH' })
  })

  it('marks emerging pairs', () => {
    const w = show()

    expect(w.findAll('.emerging')).toHaveLength(1)
    expect(w.findAll('tbody tr')[1].find('.emerging').text()).toBe('Emerging')
  })

  it('shows the label state of each row: Listed / Partly listed / Not listed', () => {
    expect(col(show(), 3)).toEqual(['Listed', 'Not listed', 'Partly listed'])
  })

  it('hides the Shortage column while the backend does not send it', () => {
    expect(show().findAll('thead th').map((h) => h.text())).not.toContain('Shortage')
  })

  it('shows a Shortage column with the FDA list status once the rows carry it', () => {
    const w = show({ signals: [
      row({ in_shortage: true, shortage_status: 'CURRENT' }),
      row({ rxcui: '9', in_shortage: false, shortage_status: 'TO_BE_DISCONTINUED' }),
      row({ rxcui: '7', in_shortage: false, shortage_status: 'RESOLVED' }),
      row({ rxcui: '8', in_shortage: false, shortage_status: null }),
    ] })

    expect(w.findAll('thead th').map((h) => h.text())).toContain('Shortage')
    expect(col(w, 4)).toEqual(['In shortage', 'To be discontinued', 'Shortage resolved', 'No shortage'])
    expect(w.find('tbody tr').findAll('td')[4].find('.chip').classes()).toContain('amber')
  })

  describe('pagination', () => {
    it('shows the page, the page count and the total', () => {
      const w = show({ page: 2, totalPages: 5, total: 41 })

      expect(w.find('.pager').text()).toContain('Page 2 of 5 · 41 pairs')
    })

    it('emits the previous and the next page', async () => {
      const w = show({ page: 2, totalPages: 5 })

      await w.findAll('.pager button')[0].trigger('click')
      await w.findAll('.pager button')[1].trigger('click')

      expect(w.emitted('page')).toEqual([[1], [3]])
    })

    it('disables Previous on the first page and Next on the last', () => {
      const first = show({ page: 1, totalPages: 5 })
      expect(first.findAll('.pager button')[0].attributes('disabled')).toBeDefined()
      expect(first.findAll('.pager button')[1].attributes('disabled')).toBeUndefined()

      const last = show({ page: 5, totalPages: 5 })
      expect(last.findAll('.pager button')[0].attributes('disabled')).toBeUndefined()
      expect(last.findAll('.pager button')[1].attributes('disabled')).toBeDefined()
    })

    it('does not page past the ends and disables both while loading', async () => {
      const w = show({ page: 1, totalPages: 1 })
      await w.findAll('.pager button')[0].trigger('click')
      await w.findAll('.pager button')[1].trigger('click')
      expect(w.emitted('page')).toBeUndefined()

      const busy = show({ page: 2, totalPages: 5, loading: true })
      expect(busy.findAll('.pager button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
      expect(busy.find('.signals').attributes('aria-busy')).toBe('true')
    })

    it('says "1 pair" for a single result', () => {
      expect(show({ signals: [row()], total: 1 }).find('.pager').text()).toContain('1 pair')
      expect(show({ signals: [row()], total: 1 }).find('.pager').text()).not.toContain('1 pairs')
    })
  })

  describe('sorting the current page', () => {
    it('starts in the order the backend sent', () => {
      expect(col(show(), 0)).toEqual(['BRAVO', 'ALPHA', 'CHARLIE'])
    })

    it('sorts numbers high to low first, then low to high, then back to the original order', async () => {
      const w = show()
      const header = () => w.findAll('thead .sort')[2]   // Reports

      await header().trigger('click')
      expect(col(w, 2)).toEqual(['90', '50', '30'])
      await header().trigger('click')
      expect(col(w, 2)).toEqual(['30', '50', '90'])
      await header().trigger('click')
      expect(col(w, 0)).toEqual(['BRAVO', 'ALPHA', 'CHARLIE'])
    })

    it('sorts text A to Z first, then Z to A', async () => {
      const w = show()

      await w.findAll('thead .sort')[0].trigger('click')
      expect(col(w, 0)).toEqual(['ALPHA', 'BRAVO', 'CHARLIE'])
      await w.findAll('thead .sort')[0].trigger('click')
      expect(col(w, 0)).toEqual(['CHARLIE', 'BRAVO', 'ALPHA'])
    })


    it('reports the sort state for screen readers and says in the tooltip that only this page is sorted', async () => {
      const w = show()
      expect(w.findAll('thead th')[2].attributes('aria-sort')).toBe('none')

      await w.findAll('thead .sort')[2].trigger('click')

      expect(w.findAll('thead th')[2].attributes('aria-sort')).toBe('descending')
      expect(w.findAll('thead .sort')[2].attributes('title')).toBe('Sorts the rows on this page only')
    })

    it('does not change the page it was given (sorting works on a copy)', async () => {
      const signals = three()
      const w = show({ signals })

      await w.findAll('thead .sort')[2].trigger('click')

      expect(signals.map((s) => s.drug)).toEqual(['BRAVO', 'ALPHA', 'CHARLIE'])
    })
  })
})

describe('PRRBadge', () => {
  const badge = (props) => mount(PRRBadge, { props }).find('.badge')

  it('shows one decimal, with two in the tooltip', () => {
    const w = mount(PRRBadge, { props: { prr: 4.87 } })

    expect(w.text()).toBe('4.9')
    expect(w.find('.badge').attributes('title')).toBe('PRR 4.87')
    expect(w.attributes('tabindex')).toBeUndefined()
  })

  it('with the CI lower bound and chi-square: focusable, and describes itself with all three numbers', () => {
    const w = mount(PRRBadge, { props: { prr: 4.87, ciLower: 4.481, chiSquare: 1609.44 } })
    const tip = w.find('[role="tooltip"]')

    expect(w.attributes('tabindex')).toBe('0')
    expect(w.attributes('aria-describedby')).toBe(tip.attributes('id'))
    expect(tip.findAll('.row').map((r) => r.text())).toEqual(['PRR4.87', '95% CI lower bound4.48', 'Chi-square1609.4'])
    expect(w.find('.badge').attributes('title')).toBeUndefined()
  })

  it('has no details popup without a PRR', () => {
    expect(mount(PRRBadge, { props: { prr: null, ciLower: 1, chiSquare: 5 } }).find('[role="tooltip"]').exists()).toBe(false)
  })

  it('is coral from 3, amber from 2 and slate below 2', () => {
    expect(badge({ prr: 3 }).classes()).toContain('coral')
    expect(badge({ prr: 2.4 }).classes()).toContain('amber')
    expect(badge({ prr: 1.9 }).classes()).toContain('slate')
    expect(severityTone(10)).toBe('coral')
  })

  it('shows a dash when there is no number', () => {
    expect(mount(PRRBadge, { props: { prr: null } }).text()).toBe('–')
    expect(mount(PRRBadge, { props: { prr: NaN } }).text()).toBe('–')
  })
})

describe('LabelGapChip', () => {
  it.each([
    ['FULL', 'Listed', 'green'],
    ['PARTIAL', 'Partly listed', 'amber'],
    ['NONE', 'Not listed', 'coral'],
  ])('%s reads "%s" in %s', (match, text, tone) => {
    const w = mount(LabelGapChip, { props: { labelMatch: match } })

    expect(w.text()).toBe(text)
    expect(w.classes()).toContain(tone)
    expect(labelMatchTone(match)).toBe(tone)
  })

  it('shows an unknown or missing state as a neutral "Unknown"', () => {
    for (const labelMatch of ['SOMETHING', null, undefined]) {
      const w = mount(LabelGapChip, { props: { labelMatch } })
      expect(w.text()).toBe('Unknown')
      expect(w.classes()).toContain('slate')
    }
  })
})

describe('SignalGlossary', () => {
  const terms = (props) => mount(SignalGlossary, { props }).findAll('dt').map((d) => d.text())

  it('explains only the columns the signal tabs show, in plain words (no PRR, CI or chi-square)', () => {
    expect(terms({ tab: 'all' })).toEqual(['Reports', 'In label', 'Emerging', 'Trend'])
    expect(terms({ tab: 'emerging' })).not.toContain('PRR')
  })

  it('adds Shortage only when the table shows that column', () => {
    expect(terms({ tab: 'all', shortage: true })).toContain('Shortage')
  })

  it('explains the label-gap columns on the Label gaps tab', () => {
    expect(terms({ tab: 'gaps' })).toEqual(['Reports', 'In label', 'In indications'])
  })
})
