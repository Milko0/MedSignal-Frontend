import { describe, expect, it } from 'vitest'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'
import { statistics } from '../../helpers/fixtures'

describe('statisticsMapper', () => {
  it('maps group_by and the buckets', () => {
    expect(toStatistics(statistics)).toEqual({
      groupBy: 'age_group', buckets: [{ group: '45-64', value: 30000 }, { group: '65-74', value: 23500 }],
    })
  })
})
