import { describe, expect, it } from 'vitest'
import { toQuery } from '@/infrastructure/http/query'

describe('toQuery', () => {
  it('converts camelCase keys to snake_case', () => {
    expect(toQuery({ minReports: 20, pageSize: 10, dosageForm: 'TABLET' })).toEqual({
      min_reports: 20, page_size: 10, dosage_form: 'TABLET',
    })
  })

  it('drops null, undefined and empty strings', () => {
    expect(toQuery({ quarter: null, rxcui: undefined, reaction: '', page: 1 })).toEqual({ page: 1 })
  })

  it('keeps false and 0 because they are real values', () => {
    expect(toQuery({ onlySignals: false, page: 0 })).toEqual({ only_signals: false, page: 0 })
  })

  it('leaves already-snake keys alone and accepts no argument', () => {
    expect(toQuery({ min_reports: 5 })).toEqual({ min_reports: 5 })
    expect(toQuery()).toEqual({})
  })
})
