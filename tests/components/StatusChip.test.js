import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusChip from '@/presentation/components/common/StatusChip.vue'

describe('StatusChip', () => {
  it('shows the label of a known status', () => {
    expect(mount(StatusChip, { props: { status: 'in_shortage' } }).text()).toBe('In shortage')
  })
})
