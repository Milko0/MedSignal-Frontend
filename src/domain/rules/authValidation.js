// Client-side checks that mirror the backend limits (RegisterRequest / LoginRequest), so the user hears about a
// mistake before the request. The backend stays the authority: its 422/409 answers are mapped by mapAuthError.
export const USERNAME_MIN = 3
export const USERNAME_MAX = 32
export const PASSWORD_MIN = 8

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const text = (value) => (typeof value === 'string' ? value.trim() : '')

// Each validate* returns { field: message } and an empty object when the form is fine.
export function validateLogin({ identifier, password }) {
  const errors = {}
  if (!text(identifier)) errors.identifier = 'Enter your username or email'
  if (!password) errors.password = 'Enter your password'
  return errors
}

export function validateRegister({ username, email, password }) {
  const errors = {}
  const name = text(username)
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    errors.username = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`
  }
  if (!EMAIL.test(text(email))) errors.email = 'Enter a valid email address'
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters`
  }
  return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0

const FORM_FIELDS = { login: ['identifier', 'password'], register: ['username', 'email', 'password'] }

// Turns an ApiError from login/register into what the form shows: messages under fields and/or a banner.
//   login 401      -> banner "Wrong username/email or password"
//   register 409   -> under the username field (the backend does not say whether name or email clashed)
//   422            -> the fields the backend named; a banner if none of them is on this form
//   anything else  -> banner with the error's own message (network errors already carry a readable one)
export function mapAuthError(error, kind) {
  const status = error?.status
  if (kind === 'login' && status === 401) return { fields: {}, banner: 'Wrong username/email or password' }
  if (kind === 'register' && status === 409) return { fields: { username: error.message }, banner: '' }
  if (status === 422) {
    const fields = {}
    for (const [field, message] of Object.entries(error.fieldErrors ?? {})) {
      if (FORM_FIELDS[kind].includes(field)) fields[field] = message
    }
    if (hasErrors(fields)) return { fields, banner: '' }
  }
  return { fields: {}, banner: error?.message || 'Something went wrong. Please try again.' }
}
