import { httpClient } from '@/infrastructure/http/httpClient'
import { toQuery } from '@/infrastructure/http/query'
import { toStatistics } from '@/infrastructure/mappers/statisticsMapper'

export const statisticsApi = {
  // FR-08: groupBy is required by the backend (age_group|sex|country|seriousness|report_type|quarter)
  get: ({ groupBy, rxcui, quarter } = {}) =>
    httpClient.get('/statistics', { params: toQuery({ groupBy, rxcui, quarter }) }).then((r) => toStatistics(r.data)),
}
