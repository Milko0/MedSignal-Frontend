export function createDrugService(drugsApi, shortagesApi) {
  return {
    search: (query, limit) => drugsApi.search(query, limit),
    getDrug360: (rxcui, options) => drugsApi.overview(rxcui, options),
    getReactionTrend: (rxcui, months) => drugsApi.reactionTrend(rxcui, months),
    getLabelGaps: (rxcui, minReports) => drugsApi.labelGaps(rxcui, minReports),
    getAlternatives: (rxcui, options) => shortagesApi.alternatives(rxcui, options),
  }
}
