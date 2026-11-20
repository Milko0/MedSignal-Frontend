import { describe, expect, it } from 'vitest'
import { safeRedirect } from '@/domain/rules/safeRedirect'

describe('safeRedirect', () => {
  it('accepts internal paths, with query and hash', () => {
    expect(safeRedirect('/signals')).toBe('/signals')
    expect(safeRedirect('/my-medicines')).toBe('/my-medicines')
    expect(safeRedirect('/drugs/5640?tab=trend#top')).toBe('/drugs/5640?tab=trend#top')
  })

  it('rejects protocol-relative and absolute urls', () => {
    expect(safeRedirect('//evil.com')).toBe('/')
    expect(safeRedirect('http://evil.com')).toBe('/')
    expect(safeRedirect('https://evil.com/signals')).toBe('/')
    expect(safeRedirect('javascript:alert(1)')).toBe('/')
  })

  it('rejects backslash tricks that browsers read as //', () => {
    expect(safeRedirect('/\\evil.com')).toBe('/')
  })

  it('falls back when there is no usable value', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect('')).toBe('/')
    expect(safeRedirect(['/signals'])).toBe('/')
    expect(safeRedirect('signals')).toBe('/')
  })

  it('uses the given fallback', () => {
    expect(safeRedirect('//evil.com', '/profile')).toBe('/profile')
  })
})
