/**
 * @typedef {Object} Alternative
 * @property {'SAME_INGREDIENT'|'SAME_CLASS'} matchType
 * @property {string} rxcui
 * @property {string} name
 * @property {string|null} dosageForm
 * @property {string[]} routes
 * @property {number} recalls
 * @property {'LOW'|'MODERATE'|'HIGH'} signalProfile
 * @property {number} productsAvailable
 * @property {number} rank
 */

/**
 * @typedef {Object} Alternatives
 * @property {string|null} targetDosageForm
 * @property {string[]} targetRoutes
 * @property {Alternative[]} items
 */
export {}
