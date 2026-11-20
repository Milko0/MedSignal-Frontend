import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ToggleSwitch from '@/presentation/components/common/ToggleSwitch.vue'

function show(props = {}) {
  const w = mount(ToggleSwitch, {
    attachTo: document.body,
    props: {
      label: 'New recall',
      modelValue: false,
      // what the parent does with v-model
      'onUpdate:modelValue': (v) => w.setProps({ modelValue: v }),
      ...props,
    },
  })
  return w
}
const input = (w) => w.find('input')

afterEach(() => { document.body.innerHTML = '' })

describe('ToggleSwitch', () => {
  it('is a switch with its label, and says whether it is on', async () => {
    const w = show()
    expect(input(w).attributes('role')).toBe('switch')
    expect(w.text()).toContain('New recall')
    expect(input(w).attributes('aria-checked')).toBe('false')

    await w.setProps({ modelValue: true })
    expect(input(w).attributes('aria-checked')).toBe('true')
    expect(input(w).element.checked).toBe(true)
  })

  it('a click turns it on and off through v-model', async () => {
    const w = show()
    await input(w).setValue(true)
    expect(w.emitted('update:modelValue').at(-1)).toEqual([true])
    expect(input(w).attributes('aria-checked')).toBe('true')

    await input(w).setValue(false)
    expect(w.emitted('update:modelValue').at(-1)).toEqual([false])
    expect(input(w).attributes('aria-checked')).toBe('false')
  })

  it('the label text is clickable too', async () => {
    const w = show()
    await w.find('.label').trigger('click')
    expect(w.emitted('update:modelValue').at(-1)).toEqual([true])
  })

  it('Enter toggles it (Space is the native key of a checkbox)', async () => {
    const w = show()
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue').at(-1)).toEqual([true])
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue').at(-1)).toEqual([false])
  })

  it('Enter does not submit a form around it', async () => {
    const submitted = []
    const Form = {
      components: { ToggleSwitch },
      data: () => ({ on: false }),
      template: '<form @submit.prevent="$emit(\'sent\')"><ToggleSwitch v-model="on" label="Show all pairs" /></form>',
    }
    const w = mount(Form, { attachTo: document.body, attrs: { onSent: () => submitted.push(1) } })
    const keydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    w.find('input').element.dispatchEvent(keydown)
    expect(keydown.defaultPrevented).toBe(true)
    expect(submitted).toEqual([])
  })

  it('a disabled switch does not change', async () => {
    const w = show({ disabled: true })
    expect(input(w).attributes('disabled')).toBeDefined()
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('shows a hint under the label and ties it to the switch for screen readers', () => {
    const w = show({ hint: 'A recall is published.' })
    const hint = w.find('.hint')
    expect(hint.text()).toBe('A recall is published.')
    expect(input(w).attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('has no description when there is no hint', () => {
    expect(input(show()).attributes('aria-describedby')).toBeUndefined()
  })
})
