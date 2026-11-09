import { describe, expect, it } from 'vitest'
import { signalSeverity } from '@/domain/rules/signalSeverity'
import { isEmerging } from '@/domain/rules/isEmerging'

describe('domain rules', () => {
  it('maps PRR to severity', () => {
    expect(signalSeverity(3.4)).toBe('high')
    expect(signalSeverity(2.1)).toBe('medium')
    expect(signalSeverity(1.2)).toBe('low')
  })
  it('detects emerging signals', () => {
    expect(isEmerging(3.4, [2.0, 2.1, 2.2])).toBe(true)
    expect(isEmerging(2.2, [2.0, 2.1, 2.2])).toBe(false)
  })
})
