import { describe, expect, it } from 'vitest'
import { toDrug360, toSearchResult } from '@/infrastructure/mappers/drugMapper'
import { drug360, drug360NoShortage, drugSearchResult } from '../../helpers/fixtures'

describe('drugMapper', () => {
  it('maps a search result', () => {
    expect(toSearchResult(drugSearchResult)).toEqual({
      rxcui: '5640', name: 'ibuprofen', brandNames: ['Advil', 'Motrin'], matched: 'Advil', score: 0.93,
    })
  })

  it('maps the full Drug 360 response', () => {
    const m = toDrug360(drug360)
    expect(m.brandNames).toEqual(['Advil', 'Motrin'])
    expect(m.atcClasses).toEqual([{ id: 'M01AE', name: 'Propionic acid derivatives' }])
    expect(m.selectedDosageForm).toBe('TABLET')
    expect(m.selectedRoute).toBe('ORAL')
    expect(m.shortage).toEqual({
      status: 'CURRENT', packagesInShortage: 3, packagesTotal: 41, dosageForms: ['TABLET', 'SUSPENSION'],
      since: '2026-02-11', reasons: ['Increased demand'],
    })
    expect(m.recalls).toEqual({ classI: 0, classII: 2, classIII: 1, notClassified: 1, total: 4, linkedShare: 0.62 })
    expect(m.label).toEqual({
      available: true, productTypes: ['HUMAN PRESCRIPTION DRUG LABEL'], effectiveDate: '2025-08-30',
      hasBoxedWarning: true, description: 'Nonsteroidal anti-inflammatory drug.',
    })
    expect(m.topReactions[0]).toEqual({ reaction: 'Gastrointestinal haemorrhage', reports: 1204 })
    expect(m.isFollowed).toBe(true)
    expect(m.matchCoverage).toBe(0.87)
  })

  it('keeps a missing shortage status as null instead of inventing one', () => {
    const m = toDrug360(drug360NoShortage)
    expect(m.shortage.status).toBeNull()
    expect(m.shortage.since).toBeNull()
    expect(m.shortage.reasons).toEqual([])
    expect(m.label.effectiveDate).toBeNull()
    expect(m.label.description).toBeNull()
    expect(m.label.available).toBe(false)
    expect(m.selectedDosageForm).toBeNull()
    expect(m.brandNames).toEqual([])
    expect(m.recalls.total).toBe(0)
    expect(m.isFollowed).toBe(false)
  })

  it('does not carry the fields the backend never had', () => {
    const m = toDrug360(drug360)
    for (const k of ['description', 'drugClass', 'dosageForm', 'topSignals', 'disclaimer']) expect(m).not.toHaveProperty(k)
    expect(m.shortage).not.toHaveProperty('expectedReturn')
  })
})
