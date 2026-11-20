/**
 * @typedef {Object} LabelGap
 * @property {string} reaction
 * @property {number} reports
 * @property {'PARTIAL'|'NONE'} matchLevel
 * @property {boolean} inIndications
 */

/**
 * @typedef {Object} LabelGaps
 * @property {boolean} labelAvailable
 * @property {boolean} comparable   false when only OTC labels exist (no adverse reaction section)
 * @property {string|null} note
 * @property {LabelGap[]} gaps
 * @property {string|null} [disclaimer]  added by the adapter from meta.disclaimer
 */
export {}
