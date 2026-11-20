import { describe, expect, it } from 'vitest'
import {
  defaultFilters, defaultMinReports, describeEmpty, effectiveMinReports, filterApplies, filtersFromQuery, queryFromFilters,
} from '@/domain/rules/signalFilters'

describe('filtersFromQuery', () => {
  it('gives the defaults for an empty query', () => {
    expect(filtersFromQuery({})).toEqual(defaultFilters())
    expect(filtersFromQuery()).toEqual(defaultFilters())
  })

  it('reads every field', () => {
    expect(filtersFromQuery({
      tab: 'emerging', rxcui: '5640', drug: 'IBUPROFEN', reaction: ' nausea ', quarter: '2026Q2', min: '50', all: '1', page: '3',
    })).toEqual({
      tab: 'emerging', rxcui: '5640', drugName: 'IBUPROFEN', reaction: 'nausea', quarter: '2026Q2',
      minReports: 50, onlySignals: false, page: 3, pageSize: 10,
    })
  })

  it('reads the link the dashboard builds for a row', () => {
    const f = filtersFromQuery({ rxcui: '2878', reaction: 'FACET JOINT SYNDROME' })

    expect(f.tab).toBe('all')
    expect(f.rxcui).toBe('2878')
    expect(f.drugName).toBeNull()
    expect(f.reaction).toBe('FACET JOINT SYNDROME')
  })

  it('takes the first value when a key is repeated', () => {
    expect(filtersFromQuery({ tab: ['gaps', 'all'], page: ['2', '9'] })).toMatchObject({ tab: 'gaps', page: 2 })
  })

  it('drops invalid values to their defaults instead of failing', () => {
    const f = filtersFromQuery({
      tab: 'everything', rxcui: 'a b/c', quarter: '2026Q9', min: '-5', page: '0', all: 'maybe', reaction: 'x'.repeat(300),
    })

    expect(f).toEqual(defaultFilters())
  })

  it('rejects non-numeric, zero, negative and absurd numbers', () => {
    for (const bad of ['abc', '1.5', '0', '-1', '', '99999999999']) {
      expect(filtersFromQuery({ min: bad }).minReports).toBeNull()
      expect(filtersFromQuery({ page: bad }).page).toBe(1)
    }
  })

  it('ignores the drug name when there is no valid rxcui', () => {
    expect(filtersFromQuery({ drug: 'IBUPROFEN' }).drugName).toBeNull()
  })

  it('upper-cases a quarter typed in lower case', () => {
    expect(filtersFromQuery({ quarter: '2026q3' }).quarter).toBe('2026Q3')
  })

  it('treats all=true like all=1, and anything else as "only signals"', () => {
    expect(filtersFromQuery({ all: 'true' }).onlySignals).toBe(false)
    expect(filtersFromQuery({ all: '0' }).onlySignals).toBe(true)
  })
})

describe('queryFromFilters', () => {
  it('is empty for the defaults, so a plain visit stays /signals', () => {
    expect(queryFromFilters(defaultFilters())).toEqual({})
  })

  it('writes only what differs from the defaults, as strings', () => {
    expect(queryFromFilters({ ...defaultFilters(), rxcui: '5640', drugName: 'IBUPROFEN', quarter: '2026Q2', minReports: 50, page: 2, onlySignals: false }))
      .toEqual({ rxcui: '5640', drug: 'IBUPROFEN', quarter: '2026Q2', min: '50', all: '1', page: '2' })
  })

  it('leaves out a minimum that equals the default of the tab', () => {
    expect(queryFromFilters({ ...defaultFilters(), minReports: 20 })).toEqual({})
    expect(queryFromFilters({ ...defaultFilters(), tab: 'emerging', minReports: 3 })).toEqual({ tab: 'emerging' })
    expect(queryFromFilters({ ...defaultFilters(), tab: 'emerging', minReports: 20 })).toEqual({ tab: 'emerging', min: '20' })
  })

  it('does not write filters the tab does not use', () => {
    const f = { ...defaultFilters(), tab: 'emerging', rxcui: '5640', drugName: 'X', reaction: 'nausea', onlySignals: false, quarter: '2026Q1' }

    expect(queryFromFilters(f)).toEqual({ tab: 'emerging', quarter: '2026Q1' })
    expect(queryFromFilters({ ...f, tab: 'gaps' })).toEqual({ tab: 'gaps', rxcui: '5640', drug: 'X' })
  })

  it('trims the reaction and drops a blank one', () => {
    expect(queryFromFilters({ ...defaultFilters(), reaction: '  nausea ' })).toEqual({ reaction: 'nausea' })
    expect(queryFromFilters({ ...defaultFilters(), reaction: '   ' })).toEqual({})
  })

  it('leaves out the drug name without an rxcui and page 1', () => {
    expect(queryFromFilters({ ...defaultFilters(), drugName: 'X', page: 1 })).toEqual({})
  })
})

describe('round trip', () => {
  const cases = [
    { ...defaultFilters() },
    { ...defaultFilters(), tab: 'all', rxcui: '5640', drugName: 'IBUPROFEN', reaction: 'nausea', quarter: '2025Q4', minReports: 5, onlySignals: false, page: 7 },
    { ...defaultFilters(), tab: 'emerging', quarter: '2026Q1', minReports: 20, page: 2 },
    { ...defaultFilters(), tab: 'gaps', rxcui: '700810', drugName: 'LISDEXAMFETAMINE', minReports: 100 },
  ]

  it.each(cases.map((c, i) => [i, c]))('case %i survives filters -> query -> filters', (_, filters) => {
    expect(filtersFromQuery(queryFromFilters(filters))).toEqual(filters)
  })

  it('survives a trip through a URL string (what the browser does to the values)', () => {
    const filters = cases[1]
    const params = new URLSearchParams(queryFromFilters(filters))
    const back = Object.fromEntries(new URLSearchParams(params.toString()))

    expect(filtersFromQuery(back)).toEqual(filters)
  })
})

describe('tab rules', () => {
  it('has a minimum per tab: 20 for all and gaps, 3 for emerging', () => {
    expect(defaultMinReports('all')).toBe(20)
    expect(defaultMinReports('gaps')).toBe(20)
    expect(defaultMinReports('emerging')).toBe(3)
  })

  it('uses the tab default until a minimum is set', () => {
    expect(effectiveMinReports({ tab: 'emerging', minReports: null })).toBe(3)
    expect(effectiveMinReports({ tab: 'emerging', minReports: 10 })).toBe(10)
    expect(effectiveMinReports({ tab: 'all', minReports: null })).toBe(20)
  })

  it('says which filters each tab uses', () => {
    expect(['drug', 'reaction', 'quarter', 'min', 'pairs'].every((f) => filterApplies('all', f))).toBe(true)
    expect(filterApplies('emerging', 'quarter')).toBe(true)
    expect(filterApplies('emerging', 'drug')).toBe(false)
    expect(filterApplies('gaps', 'drug')).toBe(true)
    expect(filterApplies('gaps', 'quarter')).toBe(false)
    expect(filterApplies('gaps', 'reaction')).toBe(false)
  })
})

describe('describeEmpty', () => {
  it('names the quarter and the minimum and suggests a lower minimum and all pairs', () => {
    expect(describeEmpty(defaultFilters(), '2026Q3'))
      .toBe('No signals in 2026Q3 with at least 20 reports. Try a lower minimum or "Show all pairs".')
  })

  it('mentions the filters when a drug or reaction narrows the list', () => {
    const f = { ...defaultFilters(), rxcui: '5640', minReports: 5 }

    expect(describeEmpty(f, '2026Q3')).toBe('No signals in 2026Q3 matching your filters with at least 5 reports. Try a lower minimum or fewer filters or "Show all pairs".')
  })

  it('does not suggest "Show all pairs" when it is already on, nor a lower minimum at the lowest', () => {
    const f = { ...defaultFilters(), onlySignals: false, minReports: 3 }

    expect(describeEmpty(f, '2026Q3')).toBe('No signals in 2026Q3 with at least 3 reports.')
  })

  it('talks about emerging signals on the Emerging tab, with its default minimum of 3', () => {
    expect(describeEmpty({ ...defaultFilters(), tab: 'emerging' }, '2026Q3')).toBe('No emerging signals in 2026Q3 with at least 3 reports.')
    expect(describeEmpty({ ...defaultFilters(), tab: 'emerging', minReports: 10 }, null)).toBe('No emerging signals with at least 10 reports. Try a lower minimum.')
  })
})
