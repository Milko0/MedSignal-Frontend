import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Sparkline from '@/presentation/components/charts/Sparkline.vue'

const show = (values, props = {}) => mount(Sparkline, { props: { values, ...props } })
const numbers = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number)

describe('Sparkline', () => {
  it('draws one path point per value', () => {
    const w = show([3.9, 4.1, 4.87])
    const d = w.find('path').attributes('d')

    expect(d.startsWith('M')).toBe(true)
    expect(d.match(/[ML]/g)).toHaveLength(3)
  })

  it('renders nothing for an empty list, no values or only non-numbers', () => {
    expect(show([]).find('svg').exists()).toBe(false)
    expect(show(undefined).find('svg').exists()).toBe(false)
    expect(show([NaN, null, undefined]).find('svg').exists()).toBe(false)
  })

  it('puts a higher value higher up (smaller y) and keeps everything inside the box', () => {
    const w = show([1, 3, 2], { width: 80, height: 24 })
    const [x1, y1, x2, y2, x3, y3] = numbers(w.find('path').attributes('d'))

    expect(y2).toBeLessThan(y1)
    expect(y2).toBeLessThan(y3)
    expect(x1).toBeLessThan(x2)
    expect(x2).toBeLessThan(x3)
    for (const x of [x1, x2, x3]) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(80)
    }
    for (const y of [y1, y2, y3]) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(24)
    }
  })

  it('draws a flat line in the middle when all values are equal', () => {
    const w = show([2, 2, 2], { height: 24 })
    const ys = numbers(w.find('path').attributes('d')).filter((_, i) => i % 2 === 1)

    expect(new Set(ys)).toEqual(new Set([12]))
  })

  it('draws a dot for a single value', () => {
    const w = show([4.2])

    expect(w.find('path').attributes('d')).toMatch(/^M[\d.]+ [\d.]+h0$/)
    expect(w.find('circle').exists()).toBe(true)
  })

  it('marks the last value and describes the trend for screen readers', () => {
    const w = show([3.9, 4.1, 4.87])
    const [, , , , x3, y3] = numbers(w.find('path').attributes('d'))

    expect(Number(w.find('circle').attributes('cx'))).toBe(x3)
    expect(Number(w.find('circle').attributes('cy'))).toBe(y3)
    expect(w.find('svg').attributes('role')).toBe('img')
    expect(w.find('svg').attributes('aria-label')).toBe('Trend: 3.9, 4.1, 4.87')
  })

  it('uses the size it is given', () => {
    const w = show([1, 2], { width: 120, height: 30 })

    expect(w.find('svg').attributes('viewBox')).toBe('0 0 120 30')
    expect(w.find('svg').attributes('width')).toBe('120')
  })
})
