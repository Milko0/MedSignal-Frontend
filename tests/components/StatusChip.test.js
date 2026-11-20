import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusChip from '@/presentation/components/common/StatusChip.vue'
import DisclaimerFooter from '@/presentation/components/common/DisclaimerFooter.vue'
import { DISCLAIMER } from '@/core/constants/disclaimer'

describe('StatusChip', () => {
  it('shows the label of a known status', () => {
    expect(mount(StatusChip, { props: { status: 'in_shortage' } }).text()).toBe('In shortage')
  })

  it('takes a raw backend enum and applies its tone', () => {
    const chip = mount(StatusChip, { props: { status: 'TO_BE_DISCONTINUED' } })
    expect(chip.text()).toBe('To be discontinued')
    expect(chip.classes()).toContain('amber')
  })

  it('shows an unknown status as plain text in the slate tone', () => {
    const chip = mount(StatusChip, { props: { status: 'MYSTERY' } })
    expect(chip.text()).toBe('MYSTERY')
    expect(chip.classes()).toContain('slate')
  })
})

describe('DisclaimerFooter', () => {
  it('defaults to the backend disclaimer text', () => {
    expect(mount(DisclaimerFooter).text()).toBe(DISCLAIMER)
  })

  it('shows the text that came with an API response when given', () => {
    expect(mount(DisclaimerFooter, { props: { text: 'From the API' } }).text()).toBe('From the API')
  })
})
