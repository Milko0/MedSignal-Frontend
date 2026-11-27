// Pure rules of the admin screens (FR-19 to FR-27). No Vue, no HTTP.
import { PASSWORD_MIN, USERNAME_MAX, USERNAME_MIN, hasErrors } from '@/domain/rules/authValidation'
import { formatDate } from '@/domain/rules/formatShortage'

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

// ---- Shortages (FR-24) --------------------------------------------------------------------------------------------
export const SHORTAGE_STATUSES = ['CURRENT', 'TO_BE_DISCONTINUED', 'RESOLVED']
export const AVAILABILITIES = ['AVAILABLE', 'LIMITED', 'UNAVAILABLE', 'UNKNOWN']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// "a, b ,, c" -> ['a','b','c'] ; the list fields of the form are one text box each
export const splitList = (text) => (typeof text === 'string' ? text.split(/[,\n]/).map((x) => x.trim()).filter(Boolean) : [])
export const joinList = (list) => (Array.isArray(list) ? list.join(', ') : '')

// A shortage document -> the strings the form edits. null = a new, empty form.
export function shortageToForm(doc) {
  const d = doc ?? {}
  return {
    package_ndc: d.package_ndc ?? '',
    generic_name: d.generic_name ?? '',
    dosage_form: d.dosage_form ?? '',
    status: d.status ?? 'CURRENT',
    availability: d.availability ?? 'UNKNOWN',
    shortage_reason: d.shortage_reason ?? '',
    company: d.company ?? '',
    presentation: d.presentation ?? '',
    ingredient_rxcuis: joinList(d.ingredient_rxcuis),
    routes: joinList(d.routes),
    therapeutic_categories: joinList(d.therapeutic_categories),
    initial_posting_date: d.initial_posting_date ?? '',
    update_date: d.update_date ?? '',
    discontinued_date: d.discontinued_date ?? '',
  }
}

const orNull = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// The form -> the whole document PUT/POST expects. `base` is the saved document: fields the form does not edit
// (ndc11, first_seen, availability_raw, ...) are kept as they were instead of being wiped by the full replace.
export function formToShortage(form, base = {}) {
  return {
    ...base,
    package_ndc: form.package_ndc.trim(),
    generic_name: orNull(form.generic_name),
    dosage_form: orNull(form.dosage_form),
    status: form.status,
    availability: form.availability,
    shortage_reason: orNull(form.shortage_reason),
    company: orNull(form.company),
    presentation: orNull(form.presentation),
    ingredient_rxcuis: splitList(form.ingredient_rxcuis),
    routes: splitList(form.routes),
    therapeutic_categories: splitList(form.therapeutic_categories),
    initial_posting_date: orNull(form.initial_posting_date),
    update_date: orNull(form.update_date),
    discontinued_date: orNull(form.discontinued_date),
  }
}

export function validateShortage(form, { creating }) {
  const errors = {}
  if (creating && !form.package_ndc.trim()) errors.package_ndc = 'Enter the package NDC'
  if (!SHORTAGE_STATUSES.includes(form.status)) errors.status = 'Choose a status'
  if (!AVAILABILITIES.includes(form.availability)) errors.availability = 'Choose an availability'
  if (splitList(form.ingredient_rxcuis).some((x) => !/^\d+$/.test(x))) errors.ingredient_rxcuis = 'RxCUIs are numbers, separated by commas'
  for (const field of ['initial_posting_date', 'update_date', 'discontinued_date']) {
    if (form[field] && !ISO_DATE.test(form[field])) errors[field] = 'Use the format YYYY-MM-DD'
  }
  return errors
}

// Has the form changed anything compared with the saved document? (Both sides go through the same builder, so
// formatting differences such as null vs "" or list spacing do not count.)
export const shortageChanged = (form, doc) =>
  JSON.stringify(formToShortage(form, doc)) !== JSON.stringify(formToShortage(shortageToForm(doc), doc))

// 409 on create ("already exists") sits under the NDC field; 422 names fields; anything else is the banner.
export function mapShortageError(error) {
  const message = error?.message || 'Something went wrong. Please try again.'
  if (error?.status === 409) return { fields: { package_ndc: message }, banner: '' }
  if (error?.status === 422) {
    const fields = {}
    for (const [name, text] of Object.entries(error.fieldErrors ?? {})) {
      if (name in shortageToForm(null)) fields[name] = text
    }
    if (hasErrors(fields)) return { fields, banner: '' }
  }
  return { fields: {}, banner: message }
}

// One line of the shortages table.
export const shortageRow = (d) => ({
  id: d.package_ndc,
  name: d.generic_name || '—',
  form: d.dosage_form || '—',
  status: d.status,
  availability: d.availability,
  updated: d.update_date || d.initial_posting_date || null,
})

// ---- Reports (FR-22) and labels (FR-23): table rows and server errors ------------------------------------------------

const count = (list) => (Array.isArray(list) ? list.length : 0)
const seriousText = (serious) => (serious === true ? 'Serious' : serious === false ? 'Not serious' : 'Unknown')

// One line of the reports table: display-ready text/numbers, nothing nested.
export const reportRow = (d) => ({
  id: d.report_id,
  received: formatDate(d.receive_date) || '—',
  quarter: d.quarter || '—',
  serious: seriousText(d.seriousness?.serious),
  drugs: count(d.drugs),
  reactions: count(d.reactions),
  country: d.country || '—',
})

// One line of the labels table.
export const labelRow = (d) => ({
  id: d.set_id,
  version: d.version ?? 1,
  type: d.product_type || '—',
  effective: formatDate(d.effective_date) || '—',
  boxed: d.has_boxed_warning ? 'Yes' : 'No',
  ingredients: count(d.ingredient_rxcuis),
})

// The JSON dialogs have no form fields to hang messages on, so a 422 lists every field the server named
// ("receive_date — Input should be a valid date"). Anything else is the error's own message.
export function describeRecordError(error) {
  const entries = Object.entries(error?.fieldErrors ?? {})
  if (error?.status === 422 && entries.length) {
    return `The server rejected the record: ${entries.map(([field, message]) => `${field} — ${message}`).join('; ')}`
  }
  return error?.message || 'Could not save the record. Please try again.'
}

// ---- Ingestion and reconciliation (FR-19 to FR-21, FR-27) ---------------------------------------------------------
const RUN_TYPES = {
  FULL_LOAD: 'FAERS full load',
  INCREMENTAL: 'Incremental update',
  SHORTAGE_POLL: 'Shortage poll',
  RECONCILIATION: 'Reconciliation',
}
export const runTypeLabel = (type) => RUN_TYPES[type] ?? type

// A run with no end time is still going. A job that crashed logs its error and loads nothing: failed. A job that
// loaded data may still list a few source records it skipped (malformed openFDA entries): a normal outcome, shown with
// the count. -> { state: 'running'|'failed'|'skipped'|'done', label, tone }
export function runState(run) {
  if (!run.endedAt) return { state: 'running', label: 'Running', tone: 'amber' }
  if (run.errors?.length && !run.recordsLoaded) return { state: 'failed', label: 'Failed', tone: 'coral' }
  const skipped = run.recordsSkipped || run.errors?.length || 0
  if (skipped) return { state: 'skipped', label: `Done, ${skipped} skipped`, tone: 'amber' }
  return { state: 'done', label: 'Done', tone: 'green' }
}
export const isRunning = (runs) => Array.isArray(runs) && runs.some((r) => !r.endedAt)

// "12 s", "3 min 05 s", "1 h 02 min"; '' when the start is unreadable. `now` is a parameter (running jobs keep counting).
export function runDuration(run, now = new Date()) {
  const start = new Date(run.startedAt).getTime()
  const end = run.endedAt ? new Date(run.endedAt).getTime() : new Date(now).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return ''
  const s = Math.max(0, Math.round((end - start) / 1000))
  if (s < 60) return `${s} s`
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')} min`
}

// The newest quarter among the ticked files that is NOT in the database yet: the one whose load would push old
// quarters out of the rolling window, so it is what GET /ingestion/quarters?adding= is asked about. null = none.
export function quarterToPreview(files, selectedNames) {
  const quarters = files.filter((f) => selectedNames.includes(f.name) && f.quarter && !f.quarterLoaded).map((f) => f.quarter)
  return quarters.length ? [...quarters].sort().at(-1) : null
}

// The "keep N quarters" box: empty = the server's default; otherwise a whole number from 1 to 20.
// -> { ok: true, value: number|undefined } | { ok: false, error }
export function parseWindow(text) {
  const t = String(text ?? '').trim()
  if (!t) return { ok: true, value: undefined }
  if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > 20) return { ok: false, error: 'Enter a whole number from 1 to 20, or leave it empty' }
  return { ok: true, value: Number(t) }
}

// The two optional limits of the incremental update (since_days 1-365, label_limit 1-20000). Empty = the server's default.
export function parseIncremental({ sinceDays, labelLimit }) {
  const errors = {}
  const read = (text, max, field, message) => {
    const t = String(text ?? '').trim()
    if (!t) return undefined
    if (!/^\d+$/.test(t) || Number(t) < 1 || Number(t) > max) { errors[field] = message; return undefined }
    return Number(t)
  }
  const days = read(sinceDays, 365, 'sinceDays', 'Enter a whole number of days from 1 to 365')
  const limit = read(labelLimit, 20000, 'labelLimit', 'Enter a whole number from 1 to 20000')
  return { errors, value: { sinceDays: days, labelLimit: limit } }
}

// The answer of POST /admin/reconciliation is an untyped dict: show each entry as "name: value".
export function reconcileEntries(result) {
  if (!result || typeof result !== 'object') return []
  return Object.entries(result).map(([key, value]) => ({
    key: key.replace(/_/g, ' '),
    value: value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value),
  }))
}
