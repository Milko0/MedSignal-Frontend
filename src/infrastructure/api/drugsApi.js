import { httpClient } from '@/infrastructure/http/httpClient'
import { toQuery } from '@/infrastructure/http/query'
import { unwrap } from '@/infrastructure/mappers/commonMapper'
import { toDrug360, toSearchResult } from '@/infrastructure/mappers/drugMapper'
import { toLabelGaps } from '@/infrastructure/mappers/labelGapMapper'
import { toTrendPoint } from '@/infrastructure/mappers/trendMapper'

const id = (rxcui) => encodeURIComponent(rxcui)

export const drugsApi = {
  // FR-01: typo-tolerant search, query >= 2 characters, limit 1-50
  search: (query, limit) =>
    httpClient.get('/drugs', { params: toQuery({ query, limit }) }).then((r) => r.data.map(toSearchResult)),
  // FR-02: Drug 360; dosageForm/route narrow the shortage and alternatives view
  overview: (rxcui, { dosageForm, route } = {}) =>
    httpClient.get(`/drugs/${id(rxcui)}/overview`, { params: toQuery({ dosageForm, route }) }).then((r) => toDrug360(r.data)),
  // FR-03: flat [{ month, reaction, reports }]; months 3-36
  reactionTrend: (rxcui, months) =>
    httpClient.get(`/drugs/${id(rxcui)}/reaction-trend`, { params: toQuery({ months }) }).then((r) => r.data.map(toTrendPoint)),
  // FR-07: envelope { data, meta.disclaimer } -> labelGaps model + disclaimer
  labelGaps: (rxcui, minReports) =>
    httpClient.get(`/drugs/${id(rxcui)}/label-gaps`, { params: toQuery({ minReports }) }).then((r) => {
      const { data, disclaimer } = unwrap(r.data)
      return { ...toLabelGaps(data), disclaimer }
    }),
}
