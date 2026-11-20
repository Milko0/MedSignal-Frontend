import { describe, expect, it } from 'vitest'
import { pivotTrend } from '@/domain/rules/pivotTrend'

const p = (month, reaction, reports) => ({ month, reaction, reports })

describe('pivotTrend', () => {
  it('makes one series per reaction on a shared month axis', () => {
    const series = pivotTrend([
      p('2026-01', 'Nausea', 5), p('2026-02', 'Nausea', 7),
      p('2026-01', 'Headache', 2), p('2026-02', 'Headache', 3),
    ])

    expect(series).toEqual([
      { reaction: 'Nausea', months: ['2026-01', '2026-02'], counts: [5, 7] },
      { reaction: 'Headache', months: ['2026-01', '2026-02'], counts: [2, 3] },
    ])
  })

  it('fills a month a reaction has no row for with 0', () => {
    const [nausea, headache] = pivotTrend([
      p('2026-01', 'Nausea', 5), p('2026-02', 'Nausea', 7), p('2026-03', 'Nausea', 6),
      p('2026-02', 'Headache', 2),
    ])

    expect(nausea.counts).toEqual([5, 7, 6])
    expect(headache.months).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(headache.counts).toEqual([0, 2, 0])
  })

  it('fills a calendar gap in the middle of the axis, across a year change', () => {
    const [s] = pivotTrend([p('2025-11', 'Nausea', 4), p('2026-02', 'Nausea', 9)])

    expect(s.months).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    expect(s.counts).toEqual([4, 0, 0, 9])
  })

  it('sorts the months even when the rows arrive out of order', () => {
    const [s] = pivotTrend([p('2026-03', 'Nausea', 3), p('2026-01', 'Nausea', 1), p('2026-02', 'Nausea', 2)])

    expect(s.months).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(s.counts).toEqual([1, 2, 3])
  })

  it('orders the series by total reports, highest first', () => {
    const series = pivotTrend([
      p('2026-01', 'Rash', 1), p('2026-02', 'Rash', 1),
      p('2026-01', 'Nausea', 10), p('2026-02', 'Nausea', 1),
      p('2026-01', 'Headache', 4), p('2026-02', 'Headache', 4),
    ])

    expect(series.map((s) => s.reaction)).toEqual(['Nausea', 'Headache', 'Rash'])
  })

  it('keeps the top 3 by default and the first N when asked', () => {
    const points = ['A', 'B', 'C', 'D', 'E'].map((r, i) => p('2026-01', r, 50 - i * 10))

    expect(pivotTrend(points).map((s) => s.reaction)).toEqual(['A', 'B', 'C'])
    expect(pivotTrend(points, 2).map((s) => s.reaction)).toEqual(['A', 'B'])
    expect(pivotTrend(points, 10)).toHaveLength(5)
  })

  it('builds the axis from the kept series only', () => {
    const series = pivotTrend([
      p('2026-02', 'A', 9), p('2026-03', 'A', 9),
      p('2026-02', 'B', 8), p('2026-03', 'B', 8),
      p('2026-02', 'C', 7), p('2026-03', 'C', 7),
      p('2025-01', 'D', 1),   // dropped: must not stretch the axis back to January 2025
    ])

    expect(series[0].months).toEqual(['2026-02', '2026-03'])
  })

  it('breaks a tie alphabetically so the order is stable', () => {
    const series = pivotTrend([p('2026-01', 'Zeta', 5), p('2026-01', 'Alpha', 5)])

    expect(series.map((s) => s.reaction)).toEqual(['Alpha', 'Zeta'])
  })

  it('adds up repeated rows of the same month and reaction', () => {
    const [s] = pivotTrend([p('2026-01', 'Nausea', 2), p('2026-01', 'Nausea', 3)])

    expect(s.counts).toEqual([5])
  })

  it('ignores rows with an unreadable month or no reaction, and non-numeric counts count as 0', () => {
    const series = pivotTrend([
      p('2026-13', 'Nausea', 5), p('March', 'Nausea', 5), p(undefined, 'Nausea', 5), p('2026-01', '', 5),
      p('2026-01', 'Headache', 'many'),
    ])

    expect(series).toEqual([{ reaction: 'Headache', months: ['2026-01'], counts: [0] }])
  })

  it('returns an empty list for empty, missing or unusable input', () => {
    expect(pivotTrend([])).toEqual([])
    expect(pivotTrend(undefined)).toEqual([])
    expect(pivotTrend(null)).toEqual([])
    expect(pivotTrend([p('bad', 'Nausea', 1)])).toEqual([])
  })

  it('gives every series the same axis array shape the chart needs', () => {
    const series = pivotTrend([p('2026-01', 'A', 1), p('2026-02', 'B', 1)])

    for (const s of series) expect(s.counts).toHaveLength(s.months.length)
  })
})
