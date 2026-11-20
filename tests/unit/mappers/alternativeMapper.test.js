import { describe, expect, it } from 'vitest'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'
import { alternativesData } from '../../helpers/fixtures'

describe('alternativeMapper', () => {
  it('maps the target form/routes and every alternative', () => {
    const m = toAlternatives(alternativesData)
    expect(m.targetDosageForm).toBe('TABLET')
    expect(m.targetRoutes).toEqual(['ORAL'])
    expect(m.items).toHaveLength(2)
    expect(m.items[0]).toEqual({
      matchType: 'SAME_INGREDIENT', rxcui: '310965', name: 'ibuprofen 200 MG Oral Tablet', dosageForm: 'TABLET',
      routes: ['ORAL'], recalls: 0, signalProfile: 'LOW', productsAvailable: 12, rank: 1,
    })
  })

  it('keeps a missing dosage form as null', () => {
    expect(toAlternatives(alternativesData).items[1].dosageForm).toBeNull()
  })

  it('handles an empty answer', () => {
    expect(toAlternatives({ items: [] })).toEqual({ targetDosageForm: null, targetRoutes: [], items: [] })
  })
})
