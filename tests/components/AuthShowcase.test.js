import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthShowcase from '@/presentation/components/auth/AuthShowcase.vue'

const reducedMotion = (on) => { window.matchMedia = vi.fn().mockReturnValue({ matches: on }) }
const tabs = (w) => w.findAll('[role="tab"]')
const selected = (w) => tabs(w).findIndex((t) => t.attributes('aria-selected') === 'true')

describe('AuthShowcase', () => {
  beforeEach(() => { vi.useFakeTimers(); reducedMotion(false) })
  afterEach(() => { vi.useRealTimers() })

  it('starts on the signal scene and rotates every 5 seconds', async () => {
    const w = mount(AuthShowcase)
    expect(tabs(w).map((t) => t.text())).toEqual(['Spot signals early', 'Get through shortages', 'Be told, not search'])
    expect(selected(w)).toBe(0)
    await vi.advanceTimersByTimeAsync(5000)
    expect(selected(w)).toBe(1)
    await vi.advanceTimersByTimeAsync(10000)
    expect(selected(w)).toBe(0)                       // wraps around
  })

  it('jumps to a scene when its tab is clicked', async () => {
    const w = mount(AuthShowcase)
    await tabs(w)[2].trigger('click')
    expect(selected(w)).toBe(2)
    expect(w.find('.caption').text()).toContain('Follow your medicines')
  })

  it('pauses while hovered', async () => {
    const w = mount(AuthShowcase)
    await w.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(15000)
    expect(selected(w)).toBe(0)
    await w.trigger('mouseleave')
    await vi.advanceTimersByTimeAsync(5000)
    expect(selected(w)).toBe(1)
  })

  it('does not rotate for users who prefer reduced motion', async () => {
    reducedMotion(true)
    const w = mount(AuthShowcase)
    await vi.advanceTimersByTimeAsync(20000)
    expect(selected(w)).toBe(0)
  })
})
