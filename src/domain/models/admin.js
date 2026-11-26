/**
 * Admin area models (FR-19 to FR-27).
 *
 * Users reuse `User` (models/user.js). Reports, labels and shortages are edited as DOCUMENTS: the admin screens read and
 * write the backend's own JSON, so those records keep the backend shape (snake_case) and only the pure row rules in
 * domain/rules/admin.js look inside them.
 *
 * @typedef {Object} IngestionRun   one entry of GET /admin/ingestion/runs
 * @property {string} id
 * @property {string} type          FULL_LOAD | INCREMENTAL | SHORTAGE_POLL | RECONCILIATION
 * @property {string} source
 * @property {string|null} sourceLastUpdated
 * @property {string} startedAt
 * @property {string|null} endedAt  null while the job is still running
 * @property {number} recordsLoaded
 * @property {number} recordsSkipped
 * @property {string[]} errors
 * @property {Object} stats
 *
 * @typedef {Object} FaersFile      a bulk file waiting in the FAERS folder
 * @property {string} name
 * @property {string|null} quarter  e.g. "2026Q3"
 * @property {number} sizeMb
 * @property {string} modifiedAt
 * @property {boolean} quarterLoaded
 *
 * @typedef {Object} LoadedQuarters
 * @property {number} windowQuarters
 * @property {string[]} quarters    oldest first
 * @property {string|null} adding
 * @property {string[]} wouldDrop
 *
 * @typedef {Object} JobStarted     202 answer of an ingestion trigger
 * @property {string} job
 * @property {string} status
 * @property {string} detail
 */
export {}
