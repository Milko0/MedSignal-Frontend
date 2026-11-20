import { describe, expect, it } from 'vitest'
import {
  ageGroups, bucketsToMap, groupLabel, lastQuarters, quartersFromBuckets, seriousSeries, sexShares,
} from '@/domain/rules/statsShaping'

const b = (group, value) => ({ group, value })

describe('quartersFromBuckets', () => {
  it('lists the quarters newest first, once each', () => {
    expect(quartersFromBuckets([b('2025Q4', 1), b('2026Q3', 3), b('2026Q1', 2), b('2026Q3', 9)])).toEqual(['2026Q3', '2026Q1', '2025Q4'])
  })

  it('drops anything that is not a quarter and copes with missing input', () => {
    expect(quartersFromBuckets([b('2026Q5', 1), b('UNKNOWN', 1), b(null, 1), null, b('2026Q2', 1)])).toEqual(['2026Q2'])
    expect(quartersFromBuckets(undefined)).toEqual([])
  })
})

describe('groupLabel', () => {
  it('writes the known enums for people and leaves everything else alone', () => {
    expect(['UNKNOWN', 'FEMALE', 'MALE', 'SERIOUS', 'NON_SERIOUS'].map(groupLabel)).toEqual(['Unknown', 'Female', 'Male', 'Serious', 'Non-serious'])
    expect(groupLabel('65-74')).toBe('65-74')
    expect(groupLabel('US')).toBe('US')
    expect(groupLabel(undefined)).toBe('')
  })
})

describe('bucketsToMap', () => {
  it('keeps the order given, then the rest alphabetically, UNKNOWN last', () => {
    const map = bucketsToMap([b('UNKNOWN', 9), b('Z', 1), b('B', 2), b('A', 3)], ['B'])

    expect(Object.keys(map)).toEqual(['B', 'A', 'Z', 'UNKNOWN'])
    expect(map).toEqual({ B: 2, A: 3, Z: 1, UNKNOWN: 9 })
  })

  it('adds repeated groups up, treats non-numbers as 0 and skips rows without a group', () => {
    expect(bucketsToMap([b('A', 2), b('A', 3), b('B', 'many'), { value: 5 }, null])).toEqual({ A: 5, B: 0 })
  })

  it('gives {} for no buckets', () => {
    expect(bucketsToMap([])).toEqual({})
    expect(bucketsToMap(undefined)).toEqual({})
  })
})

describe('ageGroups', () => {
  it('orders the ranges 0-17 ... 75+ whatever order they arrive in, with Unknown last', () => {
    const groups = ageGroups([b('UNKNOWN', 33299), b('75+', 10125), b('18-44', 11351), b('0-17', 4780), b('65-74', 11030), b('45-64', 16193)])

    expect(Object.keys(groups)).toEqual(['0-17', '18-44', '45-64', '65-74', '75+', 'Unknown'])
    expect(groups['18-44']).toBe(11351)
    expect(groups.Unknown).toBe(33299)
  })

  it('leaves out a range with no bucket instead of inventing a zero, and puts a new group before Unknown', () => {
    const keys = Object.keys(ageGroups([b('UNKNOWN', 1), b('45-64', 2), b('NEONATE', 3)]))

    expect(keys).toEqual(['45-64', 'NEONATE', 'Unknown'])
  })
})

describe('sexShares', () => {
  it('turns counts into percentages with Female, Male, Unknown in that order', () => {
    const shares = sexShares([b('UNKNOWN', 16456), b('MALE', 27553), b('FEMALE', 42769)])

    expect(Object.keys(shares)).toEqual(['Female', 'Male', 'Unknown'])
    expect(shares.Female).toBe(49.3)
  })

  it('adds up to exactly 100 (one decimal, largest remainder)', () => {
    const cases = [
      [b('FEMALE', 42769), b('MALE', 27553), b('UNKNOWN', 16456)],
      [b('FEMALE', 1), b('MALE', 1), b('UNKNOWN', 1)],        // 33.3 x3 would give 99.9
      [b('FEMALE', 2), b('MALE', 1)],
      [b('FEMALE', 7), b('MALE', 13), b('UNKNOWN', 29)],
      [b('FEMALE', 1)],
    ]
    for (const buckets of cases) {
      const total = Object.values(sexShares(buckets)).reduce((a, c) => a + c, 0)
      expect(Math.round(total * 10) / 10).toBe(100)
    }
  })

  it('gives 33.4 / 33.3 / 33.3 for three equal parts', () => {
    expect(Object.values(sexShares([b('FEMALE', 1), b('MALE', 1), b('UNKNOWN', 1)])).sort()).toEqual([33.3, 33.3, 33.4])
  })

  it('gives {} when there are no reports', () => {
    expect(sexShares([])).toEqual({})
    expect(sexShares([b('FEMALE', 0), b('MALE', 0)])).toEqual({})
    expect(sexShares(undefined)).toEqual({})
  })

  it('shows a single group as 100', () => {
    expect(sexShares([b('FEMALE', 5)])).toEqual({ Female: 100 })
  })
})

describe('lastQuarters', () => {
  it('takes the last n quarters, oldest first', () => {
    const buckets = ['2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4'].map((q) => b(q, 1))

    expect(lastQuarters(buckets, 6)).toEqual(['2025Q3', '2025Q4', '2026Q1', '2026Q2', '2026Q3', '2026Q4'])
    expect(lastQuarters(buckets, 2)).toEqual(['2026Q3', '2026Q4'])
    expect(lastQuarters(buckets.slice(0, 3), 6)).toEqual(['2025Q1', '2025Q2', '2025Q3'])
  })
})

describe('seriousSeries', () => {
  const all = [b('2026Q3', 19520), b('2025Q4', 22307), b('2026Q1', 22343), b('2026Q2', 22608)]

  it('puts all reports and serious reports on the same, oldest-first quarter axis', () => {
    const [allLine, seriousLine] = seriousSeries(all, { '2025Q4': 12000, '2026Q1': 12500, '2026Q2': 12700, '2026Q3': 10806 })

    expect(allLine).toEqual({ reaction: 'All reports', months: ['2025Q4', '2026Q1', '2026Q2', '2026Q3'], counts: [22307, 22343, 22608, 19520] })
    expect(seriousLine).toEqual({ reaction: 'Serious', months: ['2025Q4', '2026Q1', '2026Q2', '2026Q3'], counts: [12000, 12500, 12700, 10806] })
  })

  it('keeps only the last 6 quarters', () => {
    const many = ['2024Q3', '2024Q4', '2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2'].map((q) => b(q, 10))
    const [line] = seriousSeries(many, {})

    expect(line.months).toEqual(['2025Q1', '2025Q2', '2025Q3', '2025Q4', '2026Q1', '2026Q2'])
  })

  it('puts null, not 0, where a quarter of the serious line is missing (its request failed)', () => {
    const [, seriousLine] = seriousSeries(all, { '2025Q4': 12000, '2026Q2': 12700 })

    expect(seriousLine.counts).toEqual([12000, null, 12700, null])
    expect(seriousLine.months).toHaveLength(4)
  })

  it('keeps both lines the same length when the serious data is missing entirely', () => {
    const [a, s] = seriousSeries(all, undefined)

    expect(s.counts).toEqual([null, null, null, null])
    expect(s.months).toEqual(a.months)
  })

  it('returns no series without quarters', () => {
    expect(seriousSeries([], {})).toEqual([])
    expect(seriousSeries(undefined, {})).toEqual([])
  })

  it('does not mistake a real 0 for a missing value', () => {
    const [, s] = seriousSeries([b('2026Q3', 5)], { '2026Q3': 0 })

    expect(s.counts).toEqual([0])
  })
})
