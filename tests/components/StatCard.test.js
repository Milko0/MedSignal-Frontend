import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '@/presentation/components/signals/StatCard.vue'

const show = (props = {}) => mount(StatCard, {
  props: { title: 'Reports by age group', ...props },
  slots: { default: '<div class="chart-slot">chart</div>' },
})

describe('StatCard', () => {
  it('shows the title, the note and the chart once loaded', () => {
    const w = show({ note: 'all drugs · 2026Q3', loaded: true })

    expect(w.find('h3').text()).toBe('Reports by age group')
    expect(w.find('.note').text()).toBe('all drugs · 2026Q3')
    expect(w.find('.chart-slot').exists()).toBe(true)
  })

  it('shows "Loading…" and no chart before the first answer', () => {
    const w = show({ loading: true })

    expect(w.find('[role="status"]').text()).toBe('Loading…')
    expect(w.find('.chart-slot').exists()).toBe(false)
  })

  it('keeps the old chart (dimmed) while it reloads', () => {
    const w = show({ loading: true, loaded: true })

    expect(w.find('.chart-slot').exists()).toBe(true)
    expect(w.find('.chart').classes()).toContain('dim')
    expect(w.find('[role="status"]').exists()).toBe(false)
  })

  it('shows an error with Retry when nothing was ever loaded, and Retry emits', async () => {
    const w = show({ error: new Error('boom') })
    expect(w.find('[role="alert"]').text()).toContain('Could not load this chart.')

    await w.find('[role="alert"] button').trigger('click')

    expect(w.emitted('retry')).toHaveLength(1)
    expect(w.find('.chart-slot').exists()).toBe(false)
  })

  it('keeps showing the chart it has when a reload fails', () => {
    const w = show({ error: new Error('boom'), loaded: true })

    expect(w.find('.chart-slot').exists()).toBe(true)
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('says there are no reports instead of drawing an empty chart', () => {
    const w = show({ loaded: true, empty: true })

    expect(w.text()).toContain('No reports for this selection.')
    expect(w.find('.chart-slot').exists()).toBe(false)
  })

  it('renders nothing but the title before anything happened', () => {
    const w = show()

    expect(w.find('.chart-slot').exists()).toBe(false)
    expect(w.find('.state').exists()).toBe(false)
  })
})
