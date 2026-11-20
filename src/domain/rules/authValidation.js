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

// ---- Profile page (FR-14): same limits as ProfileUpdate / PasswordChange ----

// Username and email as the profile form sends them. The backend stores the email in lower case, so a change of
// case alone is not a change.
const normalize = ({ username, email }) => ({ username: text(username), email: text(email).toLowerCase() })

export function validateProfile({ username, email }) {
  const errors = {}
  const name = text(username)
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    errors.username = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`
  }
  if (!EMAIL.test(text(email))) errors.email = 'Enter a valid email address'
  return errors
}

// Which of the two fields the form changed against the saved user, as the body for PATCH /profile ({} = nothing).
export function profileChanges(form, user) {
  const now = normalize(form)
  const saved = normalize(user ?? {})
  const changes = {}
  if (now.username !== saved.username) changes.username = text(form.username)
  if (now.email !== saved.email) changes.email = text(form.email)
  return changes
}

export function validatePasswordChange({ currentPassword, newPassword, confirmPassword }) {
  const errors = {}
  if (!currentPassword) errors.currentPassword = 'Enter your current password'
  if (typeof newPassword !== 'string' || newPassword.length < PASSWORD_MIN) {
    errors.newPassword = `New password must be at least ${PASSWORD_MIN} characters`
  } else if (newPassword === currentPassword) {
    errors.newPassword = 'Choose a password different from the current one'
  }
  if (!errors.newPassword && confirmPassword !== newPassword) errors.confirmPassword = 'The two passwords do not match'
  return errors
}

// The backend names request fields in snake_case; the form uses camelCase.
const PASSWORD_FIELDS = { current_password: 'currentPassword', new_password: 'newPassword' }

// Turns an ApiError from PATCH /profile (kind 'profile') or POST /profile/password (kind 'password') into messages
// under fields and/or a banner.
//   profile 409   -> under the field the backend named ("email already in use"); the banner if it names neither
//   password 401  -> "Current password is wrong" under the current-password field (the user stays logged in)
//   422           -> the fields the backend named; a banner if none of them is on this form
//   anything else -> banner with the error's own message
export function mapProfileError(error, kind) {
  const status = error?.status
  if (kind === 'profile' && status === 409) {
    const message = error.message || 'Already in use'
    const field = /email/i.test(message) ? 'email' : /username/i.test(message) ? 'username' : null
    return field ? { fields: { [field]: message }, banner: '' } : { fields: {}, banner: message }
  }
  if (kind === 'password' && status === 401) {
    return { fields: { currentPassword: error.message || 'Current password is wrong' }, banner: '' }
  }
  if (status === 422) {
    const allowed = kind === 'password' ? Object.values(PASSWORD_FIELDS) : ['username', 'email']
    const fields = {}
    for (const [name, message] of Object.entries(error.fieldErrors ?? {})) {
      const field = kind === 'password' ? PASSWORD_FIELDS[name] : name
      if (allowed.includes(field)) fields[field] = message
    }
    if (hasErrors(fields)) return { fields, banner: '' }
  }
  return { fields: {}, banner: error?.message || 'Something went wrong. Please try again.' }
}
