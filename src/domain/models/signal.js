/**
 * @typedef {Object} Signal
 * @property {string} rxcui
 * @property {string} drug
 * @property {string} reaction
 * @property {string} quarter
 * @property {number} reports
 * @property {number} a   2x2 table cells behind the PRR
 * @property {number} b
 * @property {number} c
 * @property {number} d
 * @property {number} prr
 * @property {number} ciLower
 * @property {number} chiSquare
 * @property {boolean} isSignal    Evans criteria met
 * @property {boolean} isEmerging
 * @property {'FULL'|'PARTIAL'|'NONE'} labelMatch
 * @property {boolean|null} inShortage  null when the backend does not send `in_shortage`
 * @property {'CURRENT'|'TO_BE_DISCONTINUED'|'RESOLVED'|null} shortageStatus  FDA shortage list status of the drug
 * @property {number[]} trend
 */

/**
 * @typedef {Object} SignalList
 * @property {Signal[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} pageSize
 * @property {number} totalPages
 * @property {string|null} quarter   the quarter the backend used (the latest one when none was asked for)
 * @property {number} matchCoverage
 * @property {string|null} [disclaimer]  added by the adapter from meta.disclaimer
 */
export {}
