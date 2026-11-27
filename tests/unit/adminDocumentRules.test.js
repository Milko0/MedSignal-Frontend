import { describe, expect, it } from 'vitest'
import { describeRecordError, labelRow, reportRow } from '@/domain/rules/admin'

describe('reportRow', () => {
  it('summarises a report with readable date, seriousness and counts', () => {
    const row = reportRow({
      report_id: '10003301', receive_date: '2026-07-04', quarter: '2026Q3', seriousness: { serious: true },
      drugs: [{}, {}], reactions: [{}, {}, {}], country: 'US',
    })
    expect(row).toEqual({ id: '10003301', received: '4 Jul 2026', quarter: '2026Q3', serious: 'Serious', drugs: 2, reactions: 3, country: 'US' })
  })

  it('tells not serious from unknown, and copes with missing parts', () => {
    expect(reportRow({ report_id: 'a', seriousness: { serious: false } }).serious).toBe('Not serious')
    const bare = reportRow({ report_id: 'a' })
    expect(bare).toMatchObject({ serious: 'Unknown', drugs: 0, reactions: 0, country: '—', received: '—', quarter: '—' })
  })
})

describe('labelRow', () => {
  it('summarises a label', () => {
    expect(labelRow({
      set_id: 'abc-123', version: 4, product_type: 'RX', effective_date: '2026-02-01', has_boxed_warning: true, ingredient_rxcuis: ['1', '2'],
    })).toEqual({ id: 'abc-123', version: 4, type: 'RX', effective: '1 Feb 2026', boxed: 'Yes', ingredients: 2 })
  })

  it('defaults version to 1 and no boxed warning', () => {
    expect(labelRow({ set_id: 'x' })).toMatchObject({ version: 1, boxed: 'No', ingredients: 0, effective: '—', type: '—' })
  })
})

describe('describeRecordError', () => {
  it('lists every field a 422 names', () => {
    const text = describeRecordError({ status: 422, message: 'Field required', fieldErrors: { receive_date: 'Field required', quarter: 'Field required' } })
    expect(text).toBe('The server rejected the record: receive_date — Field required; quarter — Field required')
  })

  it('uses the plain message for 409, 403, network and a 422 with no fields', () => {
    expect(describeRecordError({ status: 409, message: 'Report R1 already exists' })).toBe('Report R1 already exists')
    expect(describeRecordError({ status: 422, message: 'The report_id in the body must match the URL', fieldErrors: {} }))
      .toBe('The report_id in the body must match the URL')
    expect(describeRecordError({ status: 0 })).toMatch(/try again/)
  })
})
