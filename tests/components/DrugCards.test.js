import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ShortageStatusCard from '@/presentation/components/drug/ShortageStatusCard.vue'
import RecallsCard from '@/presentation/components/drug/RecallsCard.vue'
import LabelCard from '@/presentation/components/drug/LabelCard.vue'
import DosageFormSelect from '@/presentation/components/drug/DosageFormSelect.vue'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import { toDrug360 } from '@/infrastructure/mappers/drugMapper'
import { drug360, drug360NoShortage } from '../helpers/fixtures'
import { formatPercent } from '@/domain/rules/percent'

const drug = () => toDrug360(drug360)
const bare = () => toDrug360(drug360NoShortage)

describe('ShortageStatusCard', () => {
  it('has an amber border and the details while the drug is in shortage', () => {
    const w = mount(ShortageStatusCard, { props: { shortage: drug().shortage } })

    expect(w.find('section').classes()).toContain('active')
    expect(w.find('.title').text()).toBe('Currently in shortage')
    expect(w.text()).toContain('Since 11 Feb 2026 · 3 of 41 packages affected')
    expect(w.text()).toContain('Increased demand')
    expect(w.text()).toContain('TABLET; SUSPENSION')
  })

  it('says "No shortage reported" with no amber border when there is no record', () => {
    const w = mount(ShortageStatusCard, { props: { shortage: bare().shortage } })

    expect(w.find('section').classes()).not.toContain('active')
    expect(w.find('.title').text()).toBe('No shortage reported')
    expect(w.find('dl').exists()).toBe(false)
  })

  it('is not amber for a resolved shortage', () => {
    const shortage = { ...drug().shortage, status: 'RESOLVED' }
    const w = mount(ShortageStatusCard, { props: { shortage } })

    expect(w.find('section').classes()).not.toContain('active')
    expect(w.find('.title').text()).toBe('Resolved')
  })

  it('names the dosage form the view is narrowed to', () => {
    const w = mount(ShortageStatusCard, { props: { shortage: drug().shortage, selectedForm: 'TABLET' } })

    expect(w.find('h2').text()).toBe('Shortage status · TABLET')
  })
})

describe('RecallsCard', () => {
  it('shows the counts per class and "at least" with a lower-bound note when only part is linked', () => {
    const w = mount(RecallsCard, { props: { recalls: drug().recalls } })

    expect(w.findAll('.classes li').map((li) => li.text())).toEqual(['0Class I', '2Class II', '1Class III', '1Not classified'])
    expect(w.find('.total').text()).toBe('At least 4 recalls')
    expect(w.find('.note').text()).toContain('lower bound')
    expect(w.find('.note').text()).toContain('62%')
  })

  it('leaves out "at least" and the note when every recall is linked', () => {
    const recalls = { ...drug().recalls, linkedShare: 1 }
    const w = mount(RecallsCard, { props: { recalls } })

    expect(w.find('.total').text()).toBe('4 recalls')
    expect(w.find('.note').exists()).toBe(false)
  })

  it('hides "Not classified" when there are none', () => {
    const recalls = { ...drug().recalls, notClassified: 0 }
    const w = mount(RecallsCard, { props: { recalls } })

    expect(w.findAll('.classes li')).toHaveLength(3)
  })

  it('says so when no recall is linked, and uses the singular for one', () => {
    expect(mount(RecallsCard, { props: { recalls: bare().recalls } }).find('.total').text()).toBe('No recalls linked to this drug')
    const one = { ...drug().recalls, total: 1, linkedShare: 1 }
    expect(mount(RecallsCard, { props: { recalls: one } }).find('.total').text()).toBe('1 recall')
  })

  it('shows zeros, not blanks, for a drug with an empty recalls block', () => {
    const w = mount(RecallsCard, { props: { recalls: bare().recalls } })

    expect(w.findAll('.classes .n').map((n) => n.text())).toEqual(['0', '0', '0'])
  })
})

describe('LabelCard', () => {
  it('shows the update date, the boxed warning and the product types', () => {
    const w = mount(LabelCard, { props: { label: drug().label } })

    expect(w.text()).toContain('Updated 30 Aug 2025')
    expect(w.find('dd.yes').text()).toBe('Yes')
    expect(w.text()).toContain('HUMAN PRESCRIPTION DRUG LABEL')
  })

  it('says "No" without the warning colour when there is no boxed warning', () => {
    const label = { ...drug().label, hasBoxedWarning: false }
    const w = mount(LabelCard, { props: { label } })

    expect(w.find('dd.no').text()).toBe('No')
    expect(w.find('dd.yes').exists()).toBe(false)
  })

  it('shows "No label available" when there is no label', () => {
    const w = mount(LabelCard, { props: { label: bare().label } })

    expect(w.text()).toContain('No label available')
    expect(w.find('dl').exists()).toBe(false)
  })

  it('still shows the card when the label has no date', () => {
    const label = { ...drug().label, effectiveDate: null }

    expect(mount(LabelCard, { props: { label } }).text()).toContain('Label on file')
  })
})

describe('DosageFormSelect', () => {
  it('is not shown for one form or none', () => {
    expect(mount(DosageFormSelect, { props: { forms: ['TABLET'] } }).find('select').exists()).toBe(false)
    expect(mount(DosageFormSelect, { props: { forms: [] } }).find('select').exists()).toBe(false)
  })

  it('lists "All forms" and every form when there are several', () => {
    const w = mount(DosageFormSelect, { props: { forms: ['CAPSULE', 'TABLET, CHEWABLE'] } })

    expect(w.findAll('option').map((o) => o.text())).toEqual(['All forms', 'CAPSULE', 'TABLET, CHEWABLE'])
    expect(w.find('select').element.value).toBe('')
  })

  it('shows the chosen form and emits the form, or null for "All forms"', async () => {
    const w = mount(DosageFormSelect, { props: { forms: ['CAPSULE', 'TABLET'], modelValue: 'TABLET' } })
    expect(w.find('select').element.value).toBe('TABLET')

    await w.find('select').setValue('CAPSULE')
    await w.find('select').setValue('')

    expect(w.emitted('update:modelValue')).toEqual([['CAPSULE'], [null]])
  })

  it('has a label tied to the select and can be disabled', () => {
    const w = mount(DosageFormSelect, { props: { forms: ['A', 'B'], disabled: true } })

    expect(w.find('label').attributes('for')).toBe(w.find('select').attributes('id'))
    expect(w.find('select').attributes('disabled')).toBeDefined()
  })
})

describe('formatPercent', () => {
  it('rounds a share to a whole percent', () => {
    expect(formatPercent(0.171)).toBe('17%')
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(1)).toBe('100%')
  })

  it('never shows less than everything as 100%', () => {
    expect(formatPercent(0.999)).toBe('99%')
    expect(formatPercent(0.996)).toBe('99%')
  })

  it('keeps the share between 0 and 100 and gives "" for unusable input', () => {
    expect(formatPercent(1.4)).toBe('100%')
    expect(formatPercent(-0.2)).toBe('0%')
    expect(formatPercent(undefined)).toBe('')
    expect(formatPercent('0.5')).toBe('')
    expect(formatPercent(NaN)).toBe('')
  })
})

describe('StatusChip overrides', () => {
  it('takes the label and tone it is given over the ones of the status', () => {
    const w = mount(StatusChip, { props: { status: 'CURRENT', label: 'Custom', tone: 'green' } })

    expect(w.text()).toBe('Custom')
    expect(w.classes()).toContain('green')
  })

  it('still falls back to the status when nothing is overridden', () => {
    const w = mount(StatusChip, { props: { status: 'CURRENT' } })

    expect(w.text()).toBe('Currently in shortage')
    expect(w.classes()).toContain('amber')
  })
})
