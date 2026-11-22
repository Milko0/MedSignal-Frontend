import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setupPinia } from '../helpers/setupPinia'
import AppToast from '@/presentation/components/common/AppToast.vue'
import { TOAST_MS, useUiStore } from '@/application/stores/useUiStore'

setupPinia()
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('AppToast', () => {
  it('renders nothing until a message arrives, then shows it', async () => {
    const wrapper = mount(AppToast)
    expect(wrapper.find('.toast').exists()).toBe(false)
    useUiStore().notify('Saved.')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.toast').text()).toContain('Saved.')
    expect(wrapper.find('.toast').attributes('role')).toBe('status')
  })

  it('announces an error (coral) at once', async () => {
    const wrapper = mount(AppToast)
    useUiStore().notify('Could not unfollow warfarin. Try again.', 'coral')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.toast').attributes('role')).toBe('alert')
    expect(wrapper.find('.region').attributes('aria-live')).toBe('assertive')
    expect(wrapper.find('.toast').classes()).toContain('coral')
  })

  it('closes with the dismiss button', async () => {
    const wrapper = mount(AppToast)
    useUiStore().notify('Hello')
    await wrapper.vm.$nextTick()
    await wrapper.find('.x').trigger('click')
    expect(wrapper.find('.toast').exists()).toBe(false)
  })

  it('disappears on its own after the timeout', async () => {
    const wrapper = mount(AppToast)
    useUiStore().notify('Hello')
    await wrapper.vm.$nextTick()
    vi.advanceTimersByTime(TOAST_MS)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.toast').exists()).toBe(false)
  })
})

describe('useUiStore', () => {
  it('a newer message is not cleared by the older timer', () => {
    const ui = useUiStore()
    ui.notify('first')
    vi.advanceTimersByTime(TOAST_MS - 100)
    ui.notify('second')
    vi.advanceTimersByTime(200)
    expect(ui.toast?.message).toBe('second')
    vi.advanceTimersByTime(TOAST_MS)
    expect(ui.toast).toBeNull()
  })
})
