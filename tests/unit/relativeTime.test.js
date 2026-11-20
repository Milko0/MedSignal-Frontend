import { describe, expect, it } from 'vitest'
import { relativeTime } from '@/domain/rules/relativeTime'

const now = new Date('2026-11-20T12:00:00Z')
const ago = (ms) => new Date(now.getTime() - ms).toISOString()
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('relativeTime', () => {
  it('reads "just now" under a minute', () => {
    expect(relativeTime(ago(0), now)).toBe('just now')
    expect(relativeTime(ago(59 * 1000), now)).toBe('just now')
  })

  it('counts minutes from 1 to 59', () => {
    expect(relativeTime(ago(MIN), now)).toBe('1 min ago')
    expect(relativeTime(ago(59 * MIN + 59 * 1000), now)).toBe('59 min ago')
  })

  it('counts hours from 1 to 23', () => {
    expect(relativeTime(ago(HOUR), now)).toBe('1 h ago')
    expect(relativeTime(ago(2 * HOUR + 10 * MIN), now)).toBe('2 h ago')
    expect(relativeTime(ago(DAY - 1000), now)).toBe('23 h ago')
  })

  it('says "yesterday" between 24 and 48 hours', () => {
    expect(relativeTime(ago(DAY), now)).toBe('yesterday')
    expect(relativeTime(ago(2 * DAY - 1000), now)).toBe('yesterday')
  })

  it('counts days from 2 to 29', () => {
    expect(relativeTime(ago(2 * DAY), now)).toBe('2 days ago')
    expect(relativeTime(ago(29 * DAY + 5 * HOUR), now)).toBe('29 days ago')
  })

  it('falls back to the date from 30 days on', () => {
    expect(relativeTime(ago(30 * DAY), now)).toBe('2026-10-21')
    expect(relativeTime('2025-01-05T08:00:00Z', now)).toBe('2025-01-05')
  })

  it('treats a timestamp slightly in the future (clock skew) as "just now"', () => {
    expect(relativeTime(new Date(now.getTime() + 5 * MIN).toISOString(), now)).toBe('just now')
  })

  it('returns an empty string for an unreadable timestamp', () => {
    expect(relativeTime('not a date', now)).toBe('')
    expect(relativeTime(undefined, now)).toBe('')
    expect(relativeTime(null, now)).toBe('')
  })

  it('accepts a Date or a number as `now`', () => {
    expect(relativeTime(ago(2 * HOUR), now.getTime())).toBe('2 h ago')
  })
})
