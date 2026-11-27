import { describe, expect, it } from 'vitest'
import {
  formToShortage, joinList, mapShortageError, shortageChanged, shortageRow, shortageToForm, splitList, validateShortage,
} from '@/domain/rules/admin'

const saved = {
  package_ndc: '0001-0001-01', ndc11: '00001000101', generic_name: 'Lisdexamfetamine', dosage_form: 'CAPSULE',
  ingredient_rxcuis: ['700810'], routes: ['ORAL'], status: 'CURRENT', availability: 'LIMITED', availability_raw: 'Limited',
  shortage_reason: null, company: 'Acme', therapeutic_categories: [], presentation: null,
  initial_posting_date: '2026-09-12', update_date: '2026-10-01', discontinued_date: null,
  first_seen: '2026-09-12T03:00:00Z', last_seen: '2026-11-25T03:00:00Z',
}

describe('lists in a text box', () => {
  it('splitList trims, drops empties and accepts commas or new lines', () => {
    expect(splitList(' a, b ,, c\nd ')).toEqual(['a', 'b', 'c', 'd'])
    expect(splitList('')).toEqual([])
    expect(splitList(undefined)).toEqual([])
  })

  it('joinList is the reverse, and tolerates a missing list', () => {
    expect(joinList(['ORAL', 'IV'])).toBe('ORAL, IV')
    expect(joinList(undefined)).toBe('')
  })
})

describe('shortageToForm / formToShortage', () => {
  it('an empty form starts as CURRENT / UNKNOWN', () => {
    expect(shortageToForm(null)).toMatchObject({ package_ndc: '', status: 'CURRENT', availability: 'UNKNOWN', routes: '' })
  })

  it('round-trips a saved record without changing it', () => {
    const back = formToShortage(shortageToForm(saved), saved)
    expect(back).toEqual(saved)
  })

  it('keeps fields the form does not show (ndc11, first_seen, availability_raw)', () => {
    const form = { ...shortageToForm(saved), generic_name: 'Renamed' }
    const body = formToShortage(form, saved)
    expect(body.generic_name).toBe('Renamed')
    expect(body).toMatchObject({ ndc11: '00001000101', first_seen: saved.first_seen, availability_raw: 'Limited' })
  })

  it('turns blank text and blank dates into null, and the list boxes into arrays', () => {
    const form = { ...shortageToForm(null), package_ndc: ' 1111-2222-33 ', company: '  ', routes: 'ORAL, ', ingredient_rxcuis: '5640,161', update_date: '' }
    expect(formToShortage(form)).toMatchObject({
      package_ndc: '1111-2222-33', company: null, routes: ['ORAL'], ingredient_rxcuis: ['5640', '161'], update_date: null,
    })
  })
})

describe('validateShortage', () => {
  const ok = shortageToForm(saved)

  it('accepts a saved record as is', () => {
    expect(validateShortage(ok, { creating: false })).toEqual({})
  })

  it('needs the NDC only when creating (it cannot change afterwards)', () => {
    expect(validateShortage({ ...ok, package_ndc: ' ' }, { creating: true }).package_ndc).toBeTruthy()
    expect(validateShortage({ ...ok, package_ndc: '' }, { creating: false })).toEqual({})
  })

  it('rejects an unknown status or availability', () => {
    expect(validateShortage({ ...ok, status: 'GONE' }, { creating: false }).status).toBeTruthy()
    expect(validateShortage({ ...ok, availability: 'MAYBE' }, { creating: false }).availability).toBeTruthy()
  })

  it('RxCUIs must be numbers', () => {
    expect(validateShortage({ ...ok, ingredient_rxcuis: '5640, abc' }, { creating: false }).ingredient_rxcuis).toBeTruthy()
    expect(validateShortage({ ...ok, ingredient_rxcuis: '' }, { creating: false })).toEqual({})
  })

  it('dates must be YYYY-MM-DD when given', () => {
    expect(validateShortage({ ...ok, update_date: '12/09/2026' }, { creating: false }).update_date).toMatch(/YYYY-MM-DD/)
    expect(validateShortage({ ...ok, update_date: '' }, { creating: false })).toEqual({})
  })
})

describe('shortageChanged', () => {
  it('is false for an untouched form and for formatting-only differences', () => {
    expect(shortageChanged(shortageToForm(saved), saved)).toBe(false)
    expect(shortageChanged({ ...shortageToForm(saved), routes: ' ORAL ,' }, saved)).toBe(false)
    expect(shortageChanged({ ...shortageToForm(saved), shortage_reason: '   ' }, saved)).toBe(false)
  })

  it('is true when a field really changed', () => {
    expect(shortageChanged({ ...shortageToForm(saved), status: 'RESOLVED' }, saved)).toBe(true)
    expect(shortageChanged({ ...shortageToForm(saved), routes: 'ORAL, INTRAVENOUS' }, saved)).toBe(true)
  })
})

describe('mapShortageError', () => {
  it('a 409 sits under the NDC field', () => {
    expect(mapShortageError({ status: 409, message: 'Shortage 1 already exists' }).fields).toEqual({ package_ndc: 'Shortage 1 already exists' })
  })

  it('a 422 maps the named form fields, ignoring others', () => {
    const r = mapShortageError({ status: 422, message: 'x', fieldErrors: { status: 'bad status', body: 'weird' } })
    expect(r).toEqual({ fields: { status: 'bad status' }, banner: '' })
  })

  it('otherwise a banner', () => {
    expect(mapShortageError({ status: 403, message: 'Insufficient permissions' }).banner).toBe('Insufficient permissions')
    expect(mapShortageError({ status: 422, message: 'invalid', fieldErrors: {} }).banner).toBe('invalid')
  })
})

describe('shortageRow', () => {
  it('summarises a record, with dashes for missing text and the latest date', () => {
    expect(shortageRow(saved)).toMatchObject({ id: '0001-0001-01', name: 'Lisdexamfetamine', form: 'CAPSULE', updated: '2026-10-01' })
    expect(shortageRow({ package_ndc: 'x', status: 'CURRENT', availability: 'UNKNOWN' })).toMatchObject({ name: '—', form: '—', updated: null })
    expect(shortageRow({ package_ndc: 'x', initial_posting_date: '2026-01-02' }).updated).toBe('2026-01-02')
  })
})
