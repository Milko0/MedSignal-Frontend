import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LabelGapsTable from '@/presentation/components/signals/LabelGapsTable.vue'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { labelGapsData } from '../helpers/fixtures'

const show = (over = {}, props = {}) => mount(LabelGapsTable, { props: { data: toLabelGaps({ ...labelGapsData, ...over }), ...props } })

describe('LabelGapsTable', () => {
  it('lists the reactions with reports, label state and the indications flag', () => {
    const w = show()

    expect(w.findAll('tbody tr').map((r) => r.findAll('td').map((c) => c.text()))).toEqual([
      ['Tinnitus', '64', 'Not listed', 'No'],
      ['Back pain', '31', 'Partly listed', 'Yes'],
    ])
    expect(w.findAll('tbody .chip').map((c) => c.classes().find((k) => ['coral', 'amber', 'green'].includes(k)))).toEqual(['coral', 'amber'])
  })

  it('explains the indications column in a tooltip', () => {
    expect(show().find('th[title]').attributes('title')).toContain('describe the condition being treated')
  })

  it('says there is no label to compare with when none is available', () => {
    const w = show({ label_available: false, gaps: [] })

    expect(w.text()).toContain('No label is available for this drug')
    expect(w.find('table').exists()).toBe(false)
  })

  it('says only OTC labels exist when the label is not comparable and the backend gave no note', () => {
    const w = show({ comparable: false, gaps: [], note: null })

    expect(w.text()).toBe('Only OTC labels exist, which have no adverse reactions section')
    expect(w.find('table').exists()).toBe(false)
  })

  it('prefers the backend note when the label is not comparable', () => {
    const w = show({ comparable: false, gaps: [], note: 'Only an OTC label was found.' })

    expect(w.text()).toBe('Only an OTC label was found.')
  })

  it('shows a note next to a comparable table', () => {
    const w = show({ note: 'Compared against the RX label.' })

    expect(w.find('.note').text()).toBe('Compared against the RX label.')
    expect(w.find('table').exists()).toBe(true)
  })

  it('says nothing is missing, naming the minimum, when the label covers every reaction', () => {
    const w = show({ gaps: [] }, { minReports: 50 })

    expect(w.text()).toContain('No label gaps among the reactions with at least 50 reports.')
    expect(w.find('table').exists()).toBe(false)
  })
})
