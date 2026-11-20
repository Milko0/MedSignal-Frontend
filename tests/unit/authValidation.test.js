import { describe, expect, it } from 'vitest'
import {
  hasErrors, mapAuthError, mapProfileError, profileChanges, validateLogin, validateProfile, validateRegister,
} from '@/domain/rules/authValidation'

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

describe('validateProfile', () => {
  it('accepts a valid form and needs no password', () => {
    expect(validateProfile({ username: 'p7_test_user', email: 'p7_test_user@example.com' })).toEqual({})
  })

  it('applies the username and email rules of the registration', () => {
    expect(validateProfile({ username: 'ab', email: 'a@b.co' }).username).toMatch(/3-32/)
    expect(validateProfile({ username: 'a'.repeat(33), email: 'a@b.co' }).username).toBeDefined()
    expect(validateProfile({ username: 'abc', email: 'plain' }).email).toBeDefined()
    expect(Object.keys(validateProfile({ username: '', email: '' }))).toEqual(['username', 'email'])
  })
})

describe('profileChanges', () => {
  const user = { username: 'p7_test_user', email: 'p7_test_user@example.com' }

  it('is empty while the form equals the saved user', () => {
    expect(profileChanges(user, user)).toEqual({})
  })

  it('spaces around a value and a different case of the email are not changes (the backend lower-cases it)', () => {
    expect(profileChanges({ username: '  p7_test_user ', email: 'P7_Test_User@Example.com' }, user)).toEqual({})
  })

  it('lists only the fields that changed, trimmed', () => {
    expect(profileChanges({ ...user, email: ' new@example.com ' }, user)).toEqual({ email: 'new@example.com' })
    expect(profileChanges({ ...user, username: 'other_name' }, user)).toEqual({ username: 'other_name' })
    expect(profileChanges({ username: 'other_name', email: 'new@example.com' }, user))
      .toEqual({ username: 'other_name', email: 'new@example.com' })
  })

  it('a change of the username case is a change (usernames are case sensitive)', () => {
    expect(profileChanges({ ...user, username: 'P7_test_user' }, user)).toEqual({ username: 'P7_test_user' })
  })
})

describe('mapProfileError (profile)', () => {
  it('puts a 409 under the field the backend names', () => {
    expect(mapProfileError({ status: 409, message: 'username already in use' }, 'profile'))
      .toEqual({ fields: { username: 'username already in use' }, banner: '' })
    expect(mapProfileError({ status: 409, message: 'email already in use' }, 'profile'))
      .toEqual({ fields: { email: 'email already in use' }, banner: '' })
  })

  it('shows a 409 that names neither field as a banner', () => {
    expect(mapProfileError({ status: 409, message: 'Conflict' }, 'profile')).toEqual({ fields: {}, banner: 'Conflict' })
  })

  it('maps 422 field errors to the fields of the form, and falls back to a banner', () => {
    const error = { status: 422, message: 'x', fieldErrors: { email: 'not valid', page: 'y' } }
    expect(mapProfileError(error, 'profile').fields).toEqual({ email: 'not valid' })
    expect(mapProfileError({ status: 422, message: 'Bad', fieldErrors: { page: 'y' } }, 'profile'))
      .toEqual({ fields: {}, banner: 'Bad' })
  })

  it('shows network and server errors as a banner', () => {
    expect(mapProfileError({ status: 0, message: 'Cannot reach the server.' }, 'profile').banner).toMatch(/cannot reach/i)
    expect(mapProfileError(undefined, 'profile').banner).toBe('Something went wrong. Please try again.')
  })
})
