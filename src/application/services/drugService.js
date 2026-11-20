import { toDrug360 } from '@/infrastructure/mappers/drugMapper'

export function createDrugService(api) {
  return {
    search: (query) => api.search(query),
    getDrug360: (rxcui) => api.getOverview(rxcui).then(toDrug360),
    getReactionTrend: (rxcui) => api.getReactionTrend(rxcui),
    getLabelGaps: (rxcui) => api.getLabelGaps(rxcui),
    getAlternatives: (rxcui) => api.getAlternatives(rxcui),
  }
}
