/**
 * @typedef {Object} DrugSearchResult
 * @property {string} rxcui
 * @property {string} name
 * @property {string[]} brandNames
 * @property {string} matched   which name matched the query (generic or a brand)
 * @property {number} score
 */

/**
 * @typedef {Object} Drug360
 * @property {string} rxcui
 * @property {string} name
 * @property {string[]} brandNames
 * @property {{id:string, name:string}[]} atcClasses
 * @property {string|null} selectedDosageForm
 * @property {string|null} selectedRoute
 * @property {{status:'CURRENT'|'TO_BE_DISCONTINUED'|'RESOLVED'|null, packagesInShortage:number, packagesTotal:number,
 *   dosageForms:string[], since:string|null, reasons:string[]}} shortage  status null = no record
 * @property {{classI:number, classII:number, classIII:number, notClassified:number, total:number,
 *   linkedShare:number}} recalls  counts are a lower bound (linkedShare = share of all recalls linked to a drug)
 * @property {{available:boolean, productTypes:string[], effectiveDate:string|null, hasBoxedWarning:boolean,
 *   description:string|null}} label
 * @property {{reaction:string, reports:number}[]} topReactions
 * @property {boolean} isFollowed
 * @property {number} matchCoverage  share of reports whose drugs were resolved to an ingredient
 */

/**
 * @typedef {Object} TrendPoint
 * @property {string} month     YYYY-MM
 * @property {string} reaction
 * @property {number} reports
 */
export {}
