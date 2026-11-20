import { describe, expect, it } from 'vitest'
import {
  defaultMinReports, describeEmpty, effectiveMinReports, filtersFromQuery, queryFromFilters,
} from '@/domain/rules/signalFilters'

// FR-13 + FR-05: the minimum reports a logged-in user chose in their alert settings is the default filter value
// (passed in as `defaults`, never read from a store inside the rule).
describe("the user's own minimum reports (alert settings)", () => {
  const mine = { minReports: 50 }

  it('replaces the default of the All and Gaps tabs, not the Emerging one', () => {
    expect(defaultMinReports('all', 50)).toBe(50)
    expect(defaultMinReports('gaps', 50)).toBe(50)
    expect(defaultMinReports('emerging', 50)).toBe(3)
    expect(defaultMinReports('all', null)).toBe(20)
  })

  it('is used when the URL has no min', () => {
    const f = filtersFromQuery({}, mine)
    expect(f.minReports).toBeNull()
    expect(effectiveMinReports(f)).toBe(50)
    expect(effectiveMinReports(filtersFromQuery({ tab: 'gaps', rxcui: '5640' }, mine))).toBe(50)
    expect(effectiveMinReports(filtersFromQuery({ tab: 'emerging' }, mine))).toBe(3)
  })

  it('a min in the URL wins', () => {
    expect(effectiveMinReports(filtersFromQuery({ min: '5' }, mine))).toBe(5)
  })

  it('is not written to the URL, so a plain visit stays /signals', () => {
    expect(queryFromFilters(filtersFromQuery({}, mine))).toEqual({})
  })

  it('choosing the old default 20 explicitly is kept in the URL, because it is no longer the default', () => {
    const f = { ...filtersFromQuery({}, mine), minReports: 20 }
    expect(queryFromFilters(f)).toEqual({ min: '20' })
    expect(effectiveMinReports(filtersFromQuery({ min: '20' }, mine))).toBe(20)
  })

  it('choosing the user default explicitly leaves the URL clean', () => {
    expect(queryFromFilters({ ...filtersFromQuery({}, mine), minReports: 50 })).toEqual({})
  })

  it('round-trips through the URL', () => {
    const f = { ...filtersFromQuery({}, mine), minReports: 100, page: 2 }
    expect(filtersFromQuery(queryFromFilters(f), mine)).toEqual(f)
  })

  it('ignores a nonsense default', () => {
    for (const bad of [0, -5, 1.5, '50', NaN, undefined, null]) {
      expect(filtersFromQuery({}, { minReports: bad }).defaultMin, String(bad)).toBeNull()
    }
    expect(filtersFromQuery({}).defaultMin).toBeNull()
  })

  it('describes an empty list with the minimum in force', () => {
    expect(describeEmpty(filtersFromQuery({}, mine), '2026Q3')).toContain('at least 50 reports')
  })
})
