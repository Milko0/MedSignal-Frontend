import { describe, expect, it } from 'vitest'
import { hasNextPage, newRecordTemplate, parseRecordJson, quarterOf, stringifyRecord } from '@/domain/rules/admin'

describe('hasNextPage', () => {
  it('is true when the page came back full (there may be more)', () => {
    expect(hasNextPage(new Array(20).fill({}), 20)).toBe(true)
  })

  it('is false for a short page, an empty page and a non-array', () => {
    expect(hasNextPage(new Array(7).fill({}), 20)).toBe(false)
    expect(hasNextPage([], 20)).toBe(false)
    expect(hasNextPage(undefined, 20)).toBe(false)
  })
})

describe('parseRecordJson', () => {
  const opts = { idField: 'report_id' }

  it('accepts an object with the id', () => {
    const r = parseRecordJson('{"report_id":"R1","quarter":"2026Q3"}', opts)
    expect(r).toEqual({ ok: true, value: { report_id: 'R1', quarter: '2026Q3' } })
  })

  it('rejects empty text, broken JSON, arrays, null and scalars', () => {
    expect(parseRecordJson('  ', opts).ok).toBe(false)
    const broken = parseRecordJson('{"report_id": ', opts)
    expect(broken.ok).toBe(false)
    expect(broken.error).toMatch(/not valid JSON/)
    for (const text of ['[]', 'null', '12', '"x"']) {
      const r = parseRecordJson(text, opts)
      expect(r.ok, text).toBe(false)
      expect(r.error, text).toMatch(/JSON object/)
    }
  })

  it('needs the id, as text', () => {
    expect(parseRecordJson('{}', opts).error).toMatch(/"report_id" is required/)
    expect(parseRecordJson('{"report_id":""}', opts).ok).toBe(false)
    expect(parseRecordJson('{"report_id":" "}', opts).ok).toBe(false)
    expect(parseRecordJson('{"report_id":12}', opts).ok).toBe(false)
  })

  it('on edit, the id must stay the one in the URL', () => {
    const edit = { idField: 'set_id', expectedId: 'abc' }
    expect(parseRecordJson('{"set_id":"abc"}', edit).ok).toBe(true)
    const r = parseRecordJson('{"set_id":"other"}', edit)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/must stay "abc"/)
  })

  it('without an idField only the JSON itself is checked', () => {
    expect(parseRecordJson('{"a":1}').ok).toBe(true)
  })
})

describe('record templates', () => {
  it('quarterOf maps months to quarters', () => {
    expect(quarterOf('2026-01-15')).toBe('2026Q1')
    expect(quarterOf('2026-03-31')).toBe('2026Q1')
    expect(quarterOf('2026-04-01')).toBe('2026Q2')
    expect(quarterOf('2026-11-27')).toBe('2026Q4')
  })

  it('a report template has the id field empty, today as the date and its quarter', () => {
    const t = newRecordTemplate('report', '2026-11-27')
    expect(t).toMatchObject({ report_id: '', receive_date: '2026-11-27', quarter: '2026Q4', report_type: 'SPONTANEOUS' })
    expect(t.reactions[0].pt).toBe(t.reaction_pts[0])
  })

  it('a label template has set_id and the text sections', () => {
    const t = newRecordTemplate('label', '2026-11-27')
    expect(t).toMatchObject({ set_id: '', product_type: 'RX', has_boxed_warning: false })
    expect(Object.keys(t.sections)).toContain('indications_and_usage')
  })

  it('refuses a kind it has no template for', () => {
    expect(() => newRecordTemplate('user')).toThrow()
  })

  it('stringifyRecord round-trips through parseRecordJson', () => {
    const t = newRecordTemplate('report', '2026-11-27')
    t.report_id = 'R1'
    expect(parseRecordJson(stringifyRecord(t), { idField: 'report_id' }).value).toEqual(t)
  })
})
