import { describe, expect, it } from 'vitest'
import { toSignal, toSignalList } from '@/infrastructure/mappers/signalMapper'
import { signalList, signalRow } from '../../helpers/fixtures'

describe('signalMapper', () => {
  it('maps a signal row including the 2x2 cells and the label match', () => {
    expect(toSignal(signalRow)).toEqual({
      rxcui: '5640', drug: 'ibuprofen', reaction: 'Gastrointestinal haemorrhage', quarter: '2026Q3', reports: 1204,
      a: 1204, b: 9800, c: 4100, d: 880000, prr: 4.87, ciLower: 4.48, chiSquare: 1609.4,
      isSignal: true, isEmerging: false, labelMatch: 'FULL', inShortage: null, shortageStatus: null, trend: [3.9, 4.1, 4.87],
    })
  })

  it('reads in_shortage once the backend sends it, and leaves it null otherwise', () => {
    expect(toSignal({ ...signalRow, in_shortage: true }).inShortage).toBe(true)
    expect(toSignal({ ...signalRow, in_shortage: false }).inShortage).toBe(false)
    expect(toSignal({ ...signalRow, in_shortage: 'yes' }).inShortage).toBeNull()
  })

  it('reads the FDA shortage status of the drug', () => {
    expect(toSignal({ ...signalRow, shortage_status: 'TO_BE_DISCONTINUED' }).shortageStatus).toBe('TO_BE_DISCONTINUED')
  })

  it('does not carry the old novelty / inLabel fields', () => {
    const m = toSignal(signalRow)
    expect(m).not.toHaveProperty('novelty')
    expect(m).not.toHaveProperty('inLabel')
  })

  it('maps a paginated list with quarter and match coverage', () => {
    const m = toSignalList(signalList)
    expect(m.items).toHaveLength(1)
    expect(m.items[0].prr).toBe(4.87)
    expect(m).toMatchObject({ total: 41, page: 2, pageSize: 10, totalPages: 5, quarter: '2026Q3', matchCoverage: 0.87 })
  })

  it('gives null quarter and an empty page when nothing matched', () => {
    expect(toSignalList({ items: [], total: 0 })).toMatchObject({ items: [], total: 0, quarter: null, matchCoverage: 0 })
  })
})
