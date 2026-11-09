import { httpClient } from '@/infrastructure/http/httpClient'

export const drugsApi = {
  search: (query) => httpClient.get('/drugs', { params: { query } }).then((r) => r.data),
  getOverview: (rxcui) => httpClient.get(`/drugs/${rxcui}/overview`).then((r) => r.data),
  getReactionTrend: (rxcui) => httpClient.get(`/drugs/${rxcui}/reaction-trend`).then((r) => r.data),
  getLabelGaps: (rxcui) => httpClient.get(`/drugs/${rxcui}/label-gaps`).then((r) => r.data),
  getAlternatives: (rxcui) => httpClient.get(`/shortages/${rxcui}/alternatives`).then((r) => r.data),
}
