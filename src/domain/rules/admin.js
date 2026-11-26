// Pure rules of the admin screens (FR-19 to FR-27). No Vue, no HTTP.

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
