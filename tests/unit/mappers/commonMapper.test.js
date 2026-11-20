import { describe, expect, it } from 'vitest'
import { toPage, unwrap } from '@/infrastructure/mappers/commonMapper'
import { signalEnvelope, signalList, DISCLAIMER_TEXT } from '../../helpers/fixtures'

describe('commonMapper', () => {
  it('maps a paginated list to camelCase page fields and maps every item', () => {
    const page = toPage(signalList, (x) => x.rxcui)
    expect(page).toEqual({ items: ['5640'], total: 41, page: 2, pageSize: 10, totalPages: 5 })
  })

  it('gives an empty page when the body has no items', () => {
    expect(toPage({ total: 0 }, (x) => x)).toEqual({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })
  })

  it('unwraps the disclaimer envelope', () => {
    const { data, disclaimer } = unwrap(signalEnvelope)
    expect(data).toBe(signalEnvelope.data)
    expect(disclaimer).toBe(DISCLAIMER_TEXT)
  })

  it('returns a null disclaimer when meta is missing', () => {
    expect(unwrap({ data: [] })).toEqual({ data: [], disclaimer: null })
    expect(unwrap({ data: [], meta: {} }).disclaimer).toBeNull()
  })
})
