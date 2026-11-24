import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '@/presentation/components/signals/FilterBar.vue'
import SignalTabs from '@/presentation/components/signals/SignalTabs.vue'
import { defaultFilters } from '@/domain/rules/signalFilters'

const Picker = { props: ['picker'], emits: ['select'], template: '<div class="picker-stub" />' }

function show(filters = {}, quarters = ['2026Q3', '2026Q2', '2025Q4']) {
  const w = mount(FilterBar, {
    props: {
      modelValue: { ...defaultFilters(), ...filters },
      quarters,
      // what the parent does with v-model
      'onUpdate:modelValue': (v) => w.setProps({ modelValue: v }),
    },
    global: { stubs: { DrugSearchBox: Picker } },
  })
  return w
}
const lastModel = (w) => w.emitted('update:modelValue').at(-1)[0]
const field = (w, label) => w.findAll('.field').find((f) => f.find('label, .label')?.text() === label)

describe('FilterBar', () => {
  it('shows every filter with its current value', () => {
    const w = show({ rxcui: '5640', drugName: 'IBUPROFEN', reaction: 'nausea', quarter: '2026Q2', minReports: 50, onlySignals: false })

    expect(w.find('.pill').text()).toBe('IBUPROFEN')
    expect(field(w, 'Description').find('input').element.value).toBe('nausea')
    expect(field(w, 'Quarter').find('select').element.value).toBe('2026Q2')
    expect(field(w, 'Minimum reports').find('select').element.value).toBe('50')
    expect(w.find('.toggle input').element.checked).toBe(true)
  })

  it('offers "Latest" and the available quarters, and Latest is the default', () => {
    const w = show()
    const select = field(w, 'Quarter').find('select')

    expect(select.findAll('option').map((o) => o.text())).toEqual(['Latest', '2026Q3', '2026Q2', '2025Q4'])
    expect(select.element.value).toBe('')
  })

  it('keeps a quarter from the URL in the list even when the quarters did not load', () => {
    const w = show({ quarter: '2025Q1' }, [])

    expect(field(w, 'Quarter').findAll('option').map((o) => o.text())).toEqual(['Latest', '2025Q1'])
    expect(field(w, 'Quarter').find('select').element.value).toBe('2025Q1')
  })

  it('lists 3, 5, 10, 20, 50, 100 and shows the default of the tab (20, or 3 on Emerging)', () => {
    const all = show()
    expect(field(all, 'Minimum reports').findAll('option').map((o) => o.text())).toEqual(['3', '5', '10', '20', '50', '100'])
    expect(field(all, 'Minimum reports').find('select').element.value).toBe('20')
    expect(field(show({ tab: 'emerging' }), 'Minimum reports').find('select').element.value).toBe('3')
  })

  it('adds a minimum from the URL that is not one of the usual choices', () => {
    const w = show({ minReports: 7 })

    expect(field(w, 'Minimum reports').findAll('option').map((o) => o.text())).toEqual(['3', '5', '7', '10', '20', '50', '100'])
    expect(field(w, 'Minimum reports').find('select').element.value).toBe('7')
  })

  it('edits the draft: reaction, quarter, minimum and "show all pairs"', async () => {
    const w = show()

    await field(w, 'Description').find('input').setValue('  headache')
    expect(lastModel(w).reaction).toBe('  headache')
    await field(w, 'Quarter').find('select').setValue('2026Q2')
    expect(lastModel(w).quarter).toBe('2026Q2')
    await field(w, 'Minimum reports').find('select').setValue('5')
    expect(lastModel(w).minReports).toBe(5)
    await w.find('.toggle input').setValue(true)
    expect(lastModel(w).onlySignals).toBe(false)
    await field(w, 'Quarter').find('select').setValue('')
    expect(lastModel(w).quarter).toBeNull()
  })

  it('sets the drug (rxcui and name, not the name alone) when the picker selects one', async () => {
    const w = show()

    w.findComponent(Picker).vm.$emit('select', { rxcui: '5640', name: 'IBUPROFEN' })

    expect(lastModel(w)).toMatchObject({ rxcui: '5640', drugName: 'IBUPROFEN' })
  })

  it('shows the chosen drug as a chip and clears it, bringing the picker back', async () => {
    const w = show({ rxcui: '5640', drugName: 'IBUPROFEN' })
    expect(w.find('.picker-stub').exists()).toBe(false)

    await w.find('.clear').trigger('click')

    expect(lastModel(w)).toMatchObject({ rxcui: null, drugName: null })
    expect(w.find('.picker-stub').exists()).toBe(true)
  })

  it('falls back to the rxcui when the drug name is not known (a link from the dashboard)', () => {
    expect(show({ rxcui: '2878' }).find('.pill').text()).toBe('RxCUI 2878')
  })

  it('applies on submit and on Enter in the form, and resets with the Reset button', async () => {
    const w = show()

    await w.find('form').trigger('submit')
    await w.findAll('button').find((b) => b.text() === 'Apply filters').trigger('click')
    await w.findAll('button').find((b) => b.text() === 'Reset').trigger('click')

    expect(w.emitted('apply')).toHaveLength(1)   // a click on a submit button submits the form once in jsdom
    expect(w.emitted('reset')).toHaveLength(1)
  })

  describe('per tab', () => {
    it('all: every filter is shown, with no note', () => {
      const w = show({ tab: 'all' })

      expect(w.findAll('.field > label, .field > .label').map((l) => l.text())).toEqual(['Drug', 'Description', 'Quarter', 'Minimum reports', 'Show all pairs'])
      expect(w.find('.toggle').exists()).toBe(true)
      expect(w.find('.hint').exists()).toBe(false)
    })

    it('emerging: only quarter and minimum are shown (nothing greyed out), with a note', () => {
      const w = show({ tab: 'emerging' })

      expect(w.findAll('.field > label, .field > .label').map((l) => l.text())).toEqual(['Quarter', 'Minimum reports'])
      expect(w.find('.toggle').exists()).toBe(false)
      expect(w.find('.picker-stub').exists()).toBe(false)
      expect(w.findAll('input:disabled, select:disabled')).toHaveLength(0)
      expect(w.find('.hint').text()).toContain('quarter and minimum reports')
    })

    it('gaps: only drug and minimum are shown, with a note', () => {
      const w = show({ tab: 'gaps' })

      expect(w.findAll('.field > label, .field > .label').map((l) => l.text())).toEqual(['Drug', 'Minimum reports'])
      expect(w.find('.picker-stub').exists()).toBe(true)
      expect(w.find('.toggle').exists()).toBe(false)
      expect(w.find('.hint').text()).toContain('per drug')
    })

    it('does not show a chosen drug on a tab that ignores it', () => {
      const w = show({ tab: 'emerging', rxcui: '5640', drugName: 'IBUPROFEN' })

      expect(w.find('.pill').exists()).toBe(false)
      expect(w.find('.clear').exists()).toBe(false)
    })
  })
})

describe('SignalTabs', () => {
  it('shows the three tabs with the current one selected', () => {
    const w = mount(SignalTabs, { props: { modelValue: 'emerging' } })

    expect(w.findAll('[role="tab"]').map((t) => t.text())).toEqual(['All signals', 'Emerging', 'Label gaps'])
    expect(w.findAll('[role="tab"]').map((t) => t.attributes('aria-selected'))).toEqual(['false', 'true', 'false'])
  })

  it('emits the key of the tab clicked', async () => {
    const w = mount(SignalTabs, { props: { modelValue: 'all' } })

    await w.findAll('[role="tab"]')[2].trigger('click')

    expect(w.emitted('update:modelValue')).toEqual([['gaps']])
  })
})
