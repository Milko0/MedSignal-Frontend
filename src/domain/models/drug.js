/**
 * @typedef {Object} Drug
 * @property {string} rxcui
 * @property {string} name
 * @property {string} [drugClass]
 * @property {string} [dosageForm]
 * @property {{status:string, since?:string, expectedReturn?:string}} shortage
 * @property {{classI:number, classII:number, classIII:number}} recalls
 * @property {{effectiveDate?:string, hasBoxedWarning:boolean}} label
 * @property {{term:string, count:number}[]} topReactions
 * @property {boolean} isFollowed
 */
export {}
