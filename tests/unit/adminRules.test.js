import { describe, expect, it } from 'vitest'
import {
  adminUserChanges, hasNextPage, isSelf, mapAdminUserError, newRecordTemplate, newUserBody, parseRecordJson, quarterOf,
  stringifyRecord, validateAdminUser,
} from '@/domain/rules/admin'

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

describe('validateAdminUser', () => {
  const good = { username: 'luca', email: 'luca@example.com', password: 'password123', role: 'user' }

  it('accepts a complete new user', () => {
    expect(validateAdminUser(good, { creating: true })).toEqual({})
  })

  it('applies the backend limits to username, email and password', () => {
    expect(validateAdminUser({ ...good, username: 'ab' }, { creating: true }).username).toMatch(/3-32/)
    expect(validateAdminUser({ ...good, username: 'x'.repeat(33) }, { creating: true }).username).toMatch(/3-32/)
    expect(validateAdminUser({ ...good, username: '  ab  ' }, { creating: true }).username).toBeTruthy()   // trimmed first
    expect(validateAdminUser({ ...good, email: 'nope' }, { creating: true }).email).toBeTruthy()
    expect(validateAdminUser({ ...good, password: 'short' }, { creating: true }).password).toMatch(/8/)
  })

  it('needs a password when creating, but not when editing', () => {
    expect(validateAdminUser({ ...good, password: '' }, { creating: true }).password).toBeTruthy()
    expect(validateAdminUser({ ...good, password: '' }, { creating: false })).toEqual({})
  })

  it('a password given when editing must still be long enough', () => {
    expect(validateAdminUser({ ...good, password: 'short' }, { creating: false }).password).toMatch(/8/)
  })

  it('only user and admin are roles', () => {
    expect(validateAdminUser({ ...good, role: 'root' }, { creating: true }).role).toBeTruthy()
    expect(validateAdminUser({ ...good, role: 'admin' }, { creating: true })).toEqual({})
  })
})

describe('user request bodies', () => {
  it('newUserBody trims username and email', () => {
    expect(newUserBody({ username: ' luca ', email: ' luca@example.com ', password: 'password123', role: 'admin' }))
      .toEqual({ username: 'luca', email: 'luca@example.com', password: 'password123', role: 'admin' })
  })

  const saved = { id: 'u1', username: 'luca', email: 'luca@example.com', role: 'user' }

  it('adminUserChanges is empty when nothing changed (case of the email alone is not a change)', () => {
    expect(adminUserChanges({ username: 'luca', email: 'Luca@Example.com', role: 'user', password: '' }, saved)).toEqual({})
  })

  it('adminUserChanges lists only what differs', () => {
    expect(adminUserChanges({ username: 'luca', email: 'luca@example.com', role: 'admin', password: '' }, saved)).toEqual({ role: 'admin' })
    expect(adminUserChanges({ username: ' lucas ', email: 'l@example.com', role: 'user', password: 'newpassword1' }, saved))
      .toEqual({ username: 'lucas', email: 'l@example.com', password: 'newpassword1' })
  })

  it('isSelf compares ids and never matches when nobody is signed in', () => {
    expect(isSelf({ id: 'u1' }, 'u1')).toBe(true)
    expect(isSelf({ id: 'u1' }, 'u2')).toBe(false)
    expect(isSelf({ id: 'u1' }, undefined)).toBe(false)
  })
})

describe('mapAdminUserError', () => {
  const form = { username: 'luca', email: 'Luca@Example.com' }

  it('puts a 409 under the field whose value the message names', () => {
    expect(mapAdminUserError({ status: 409, message: 'luca@example.com is already in use' }, form).fields)
      .toEqual({ email: 'luca@example.com is already in use' })
    expect(mapAdminUserError({ status: 409, message: 'luca is already in use' }, { username: 'luca', email: 'x@example.com' }).fields)
      .toEqual({ username: 'luca is already in use' })
  })

  it('a 409 that names neither goes to the banner', () => {
    expect(mapAdminUserError({ status: 409, message: 'conflict' }, form)).toEqual({ fields: {}, banner: 'conflict' })
  })

  it('maps 422 field errors, ignoring unknown fields', () => {
    const r = mapAdminUserError({ status: 422, message: 'invalid', fieldErrors: { password: 'too short', foo: 'x' } }, form)
    expect(r).toEqual({ fields: { password: 'too short' }, banner: '' })
  })

  it('the last-administrator rule names no field, so it is the banner', () => {
    const r = mapAdminUserError({ status: 422, message: 'This is the last administrator: make another admin first' }, form)
    expect(r.banner).toMatch(/last administrator/)
    expect(r.fields).toEqual({})
  })

  it('anything else (403, network) is the banner, with a fallback text', () => {
    expect(mapAdminUserError({ status: 403, message: 'Insufficient permissions' }, form).banner).toBe('Insufficient permissions')
    expect(mapAdminUserError({ status: 0 }, form).banner).toMatch(/went wrong/)
  })
})
