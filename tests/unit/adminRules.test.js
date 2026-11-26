import { describe, expect, it } from 'vitest'
import { hasNextPage } from '@/domain/rules/admin'

describe('hasNextPage', () => {
  it('is true when the page came back full (there may be more)', () => {
    expect(hasNextPage(new Array(20).fill({}), 20)).toBe(true)
  })

  it('is false for a short page, an empty page and a non-array', () => {
    expect(hasNextPage(new Array(7).fill({}), 20)).toBe(false)
    expect(hasNextPage([], 20)).toBe(false)
    expect(hasNextPage(undefined, 20)).toBe(false)
  })
})
