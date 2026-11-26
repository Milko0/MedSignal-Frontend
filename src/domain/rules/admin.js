// Pure rules of the admin screens (FR-19 to FR-27). No Vue, no HTTP.
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, hasErrors } from '@/domain/rules/authValidation'

// The admin lists answer a plain array with no total, so "is there another page?" can only be guessed: a full page
// means maybe, a short one means no. (An exact multiple of the page size shows one empty last page: acceptable.)
export const hasNextPage = (rows, pageSize) => Array.isArray(rows) && rows.length >= pageSize

// ---- Reports and labels are edited as JSON documents --------------------------------------------------------------

export const stringifyRecord = (record) => JSON.stringify(record, null, 2)

// Checks the text of the JSON editor before anything is sent. The server validates the real shape (422 comes back and is
// shown); this only catches what would make the request pointless: broken JSON, not an object, no id, or an id that
// differs from the record being edited (the backend refuses that on update).
// -> { ok: true, value } | { ok: false, error }
export function parseRecordJson(text, { idField, expectedId } = {}) {
  if (!text || !text.trim()) return { ok: false, error: 'Enter the record as JSON.' }
  let value
  try {
    value = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: `This is not valid JSON: ${e.message}` }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'The record must be a JSON object ({ ... }).' }
  }
  if (idField) {
    const id = value[idField]
    if (typeof id !== 'string' || !id.trim()) return { ok: false, error: `"${idField}" is required and must be text.` }
    if (expectedId !== undefined && id !== expectedId) {
      return { ok: false, error: `"${idField}" must stay "${expectedId}": it identifies the record being edited.` }
    }
  }
  return { ok: true, value }
}

// "2026-11-20" -> "2026Q4"
export function quarterOf(isoDate) {
  const [y, m] = isoDate.split('-').map(Number)
  return `${y}Q${Math.ceil(m / 3)}`
}

// Starting text of the "new" dialogs: every field the backend knows, with neutral values to overwrite.
// `today` is an ISO date string (injected so tests do not depend on the clock).
export function newRecordTemplate(kind, today = new Date().toISOString().slice(0, 10)) {
  if (kind === 'report') {
    return {
      report_id: '',
      version: 1,
      receive_date: today,
      quarter: quarterOf(today),
      report_type: 'SPONTANEOUS',
      reporter_qualification: 'UNKNOWN',
      seriousness: { serious: false },
      patient: { sex: 'UNKNOWN', age_years: null, age_group: 'UNKNOWN', weight_kg: null },
      country: null,
      duplicate: false,
      reactions: [{ pt: 'HEADACHE', outcome: 'UNKNOWN' }],
      reaction_pts: ['HEADACHE'],
      drugs: [{ raw_name: '', active_substances: [], role: 'SUSPECT', indication: null, route_code: null,
                product_rxcuis: [], ingredient_rxcuis: [], match_method: 'UNMATCHED' }],
      suspect_ingredient_ids: [],
      all_ingredient_ids: [],
    }
  }
  if (kind === 'label') {
    return {
      set_id: '',
      version: 1,
      product_type: 'RX',
      effective_date: today,
      has_boxed_warning: false,
      product_ndcs: [],
      ingredient_rxcuis: [],
      sections: { indications_and_usage: '', adverse_reactions: '' },
      history: [],
    }
  }
  throw new Error(`No template for ${kind}`)
}

// ---- Users (FR-25) ------------------------------------------------------------------------------------------------

export const ROLES = ['user', 'admin']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const trimmed = (v) => (typeof v === 'string' ? v.trim() : '')

// Same limits as the backend's AdminUserCreate / AdminUserUpdate. On create the password is required; on edit it is
// optional (empty = keep the current one) but must be long enough when given.
export function validateAdminUser(form, { creating }) {
  const errors = {}
  const name = trimmed(form.username)
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) {
    errors.username = `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`
  }
  if (!EMAIL.test(trimmed(form.email))) errors.email = 'Enter a valid email address'
  const password = form.password ?? ''
  if (creating ? password.length < PASSWORD_MIN : password && password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters`
  }
  if (!ROLES.includes(form.role)) errors.role = 'Choose a role'
  return errors
}

// The body of POST /admin/users (all four fields).
export const newUserBody = (form) => ({
  username: trimmed(form.username),
  email: trimmed(form.email),
  password: form.password,
  role: form.role,
})

// The body of PUT /admin/users/{id}: only what differs from the saved user ({} = nothing to save). The backend stores
// the email in lower case, so a change of case alone is not a change.
export function adminUserChanges(form, user) {
  const changes = {}
  if (trimmed(form.username) !== user.username) changes.username = trimmed(form.username)
  if (trimmed(form.email).toLowerCase() !== (user.email ?? '').toLowerCase()) changes.email = trimmed(form.email)
  if (form.role !== user.role) changes.role = form.role
  if (form.password) changes.password = form.password
  return changes
}

// An ApiError from the user form -> messages under fields and/or a banner.
//   409 "<value> is already in use" -> under the field whose current value the message names
//   422 -> the fields the backend named; "This is the last administrator..." names no field, so it is the banner
export function mapAdminUserError(error, form = {}) {
  const status = error?.status
  const message = error?.message || 'Something went wrong. Please try again.'
  if (status === 409) {
    const text = message.toLowerCase()
    if (form.email && text.includes(trimmed(form.email).toLowerCase())) return { fields: { email: message }, banner: '' }
    if (form.username && text.includes(trimmed(form.username).toLowerCase())) return { fields: { username: message }, banner: '' }
    return { fields: {}, banner: message }
  }
  if (status === 422) {
    const fields = {}
    for (const [name, text] of Object.entries(error.fieldErrors ?? {})) {
      if (['username', 'email', 'password', 'role'].includes(name)) fields[name] = text
    }
    if (hasErrors(fields)) return { fields, banner: '' }
  }
  return { fields: {}, banner: message }
}

// The signed-in admin's own row: its role and deletion are locked in this screen (Profile has its own delete).
export const isSelf = (user, selfId) => !!selfId && user?.id === selfId
