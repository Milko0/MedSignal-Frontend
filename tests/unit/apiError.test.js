import { describe, expect, it } from 'vitest'
import { ApiError, toApiError } from '@/infrastructure/http/apiError'

const failure = (status, data) => ({ response: { status, data } })

describe('toApiError', () => {
  it('uses a string detail as the message', () => {
    const e = toApiError(failure(401, { detail: 'Invalid credentials' }))
    expect(e).toBeInstanceOf(ApiError)
    expect(e.status).toBe(401)
    expect(e.message).toBe('Invalid credentials')
    expect(e.fieldErrors).toEqual({})
  })

  it('turns a 422 detail array into field errors keyed by the last loc part', () => {
    const e = toApiError(failure(422, {
      detail: [
        { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
        { loc: ['body', 'password'], msg: 'String should have at least 8 characters', type: 'string_too_short' },
      ],
    }))
    expect(e.status).toBe(422)
    expect(e.message).toBe('value is not a valid email address')
    expect(e.fieldErrors).toEqual({
      email: 'value is not a valid email address',
      password: 'String should have at least 8 characters',
    })
  })

  it('keeps the first message when two errors hit the same field', () => {
    const e = toApiError(failure(422, { detail: [
      { loc: ['query', 'page'], msg: 'first' }, { loc: ['query', 'page'], msg: 'second' },
    ] }))
    expect(e.fieldErrors).toEqual({ page: 'first' })
  })

  it('reports status 0 when there is no response (network error or timeout)', () => {
    const e = toApiError({ code: 'ERR_NETWORK', message: 'Network Error' })
    expect(e.status).toBe(0)
    expect(e.message).toMatch(/cannot reach the server/i)
  })

  it('falls back to a generic message for an unknown body', () => {
    expect(toApiError(failure(500, '<html>oops</html>')).message).toBe('Request failed (500)')
    expect(toApiError(failure(503, undefined)).status).toBe(503)
    expect(toApiError(failure(400, { detail: [] })).message).toBe('Request failed (400)')
  })
})
