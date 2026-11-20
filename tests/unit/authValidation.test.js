import { describe, expect, it } from 'vitest'
import { hasErrors, mapAuthError, validateLogin, validateRegister } from '@/domain/rules/authValidation'

const good = { username: 'p2_test_user', email: 'p2_test_user@example.com', password: 'secret123' }

describe('validateRegister', () => {
  it('accepts a valid form', () => {
    expect(validateRegister(good)).toEqual({})
  })

  it('username must be 3-32 characters (spaces around do not count)', () => {
    expect(validateRegister({ ...good, username: 'ab' }).username).toMatch(/3-32/)
    expect(validateRegister({ ...good, username: '  ab  ' }).username).toBeDefined()
    expect(validateRegister({ ...good, username: 'abc' }).username).toBeUndefined()
    expect(validateRegister({ ...good, username: 'a'.repeat(32) }).username).toBeUndefined()
    expect(validateRegister({ ...good, username: 'a'.repeat(33) }).username).toBeDefined()
  })

  it('email must look like an email', () => {
    for (const email of ['', 'plain', 'a@b', '@b.co', 'a b@c.co']) {
      expect(validateRegister({ ...good, email }).email, email).toBeDefined()
    }
    expect(validateRegister({ ...good, email: ' a@b.co ' }).email).toBeUndefined()
  })

  it('password needs at least 8 characters', () => {
    expect(validateRegister({ ...good, password: '1234567' }).password).toMatch(/8/)
    expect(validateRegister({ ...good, password: '12345678' }).password).toBeUndefined()
  })

  it('reports every wrong field at once', () => {
    expect(Object.keys(validateRegister({ username: '', email: '', password: '' }))).toEqual(['username', 'email', 'password'])
  })
})

describe('validateLogin', () => {
  it('needs an identifier and a password', () => {
    expect(validateLogin({ identifier: 'p2_test_user', password: 'x' })).toEqual({})
    expect(validateLogin({ identifier: '  ', password: '' })).toEqual({
      identifier: expect.any(String),
      password: expect.any(String),
    })
  })

  it('does not apply the 8-character rule to an existing password', () => {
    expect(validateLogin({ identifier: 'a', password: 'short' })).toEqual({})
  })
})

describe('hasErrors', () => {
  it('is true only for a non-empty object', () => {
    expect(hasErrors({})).toBe(false)
    expect(hasErrors({ email: 'x' })).toBe(true)
  })
})

describe('mapAuthError', () => {
  it('shows a wrong login as one banner, not a field error', () => {
    expect(mapAuthError({ status: 401, message: 'Invalid credentials' }, 'login'))
      .toEqual({ fields: {}, banner: 'Wrong username/email or password' })
  })

  it('puts a 409 on the username field when registering', () => {
    expect(mapAuthError({ status: 409, message: 'Username or email already registered' }, 'register'))
      .toEqual({ fields: { username: 'Username or email already registered' }, banner: '' })
  })

  it('maps 422 field errors to the fields of the form', () => {
    const error = { status: 422, message: 'x', fieldErrors: { email: 'not valid', password: 'too short' } }
    expect(mapAuthError(error, 'register').fields).toEqual({ email: 'not valid', password: 'too short' })
  })

  it('falls back to a banner when a 422 names no field of this form', () => {
    const error = { status: 422, message: 'Bad request', fieldErrors: { page: 'x' } }
    expect(mapAuthError(error, 'login')).toEqual({ fields: {}, banner: 'Bad request' })
  })

  it('shows network and server errors in a banner', () => {
    expect(mapAuthError({ status: 0, message: 'Cannot reach the server. Check your connection and try again.' }, 'login').banner)
      .toMatch(/cannot reach the server/i)
    expect(mapAuthError({ status: 500, message: 'Request failed (500)' }, 'register').banner).toBe('Request failed (500)')
  })

  it('has a generic text when there is no message at all', () => {
    expect(mapAuthError(undefined, 'login').banner).toMatch(/something went wrong/i)
  })
})
