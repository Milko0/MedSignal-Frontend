import { describe, expect, it } from 'vitest'
import { toReportBrief } from '@/infrastructure/mappers/reportMapper'
import { reportBrief } from '../../helpers/fixtures'

describe('reportMapper', () => {
  it('maps report_id to id and the camelCase fields', () => {
    expect(toReportBrief(reportBrief)).toEqual({
      id: '10234567', receiveDate: '2026-07-14', serious: true, ageGroup: '65-74', sex: 'F', country: 'US',
      reactions: ['Gastrointestinal haemorrhage', 'Anaemia'], suspectDrugs: ['IBUPROFEN'],
    })
  })

  it('keeps unknown seriousness and country as null', () => {
    const m = toReportBrief({ ...reportBrief, serious: null, country: null })
    expect(m.serious).toBeNull()
    expect(m.country).toBeNull()
  })
})
