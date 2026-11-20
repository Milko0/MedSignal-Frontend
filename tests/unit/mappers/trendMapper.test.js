import { describe, expect, it } from 'vitest'
import { toTrendPoint } from '@/infrastructure/mappers/trendMapper'
import { trendPoint } from '../../helpers/fixtures'

describe('trendMapper', () => {
  it('maps a flat trend point', () => {
    expect(toTrendPoint(trendPoint)).toEqual({ month: '2026-03', reaction: 'Nausea', reports: 87 })
  })
})
