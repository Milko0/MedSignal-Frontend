import { describe, expect, it } from 'vitest'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { labelGapsData } from '../../helpers/fixtures'

describe('labelGapMapper', () => {
  it('maps the gaps and the label flags', () => {
    expect(toLabelGaps(labelGapsData)).toEqual({
      labelAvailable: true, comparable: true, note: null,
      gaps: [
        { reaction: 'Tinnitus', reports: 64, matchLevel: 'NONE', inIndications: false },
        { reaction: 'Back pain', reports: 31, matchLevel: 'PARTIAL', inIndications: true },
      ],
    })
  })

  it('keeps the explanation when only OTC labels exist', () => {
    const m = toLabelGaps({ label_available: true, comparable: false, note: 'Only OTC labels', gaps: [] })
    expect(m.comparable).toBe(false)
    expect(m.note).toBe('Only OTC labels')
    expect(m.gaps).toEqual([])
  })

  it('handles a drug with no label at all', () => {
    expect(toLabelGaps({ label_available: false })).toMatchObject({ labelAvailable: false, comparable: true, gaps: [] })
  })
})
