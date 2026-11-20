import { httpClient } from '@/infrastructure/http/httpClient'
import { toQuery } from '@/infrastructure/http/query'
import { toAlternatives } from '@/infrastructure/mappers/alternativeMapper'

export const shortagesApi = {
  // FR-10: same route and form, not in shortage, ranked
  alternatives: (rxcui, { dosageForm, route } = {}) =>
    httpClient
      .get(`/shortages/${encodeURIComponent(rxcui)}/alternatives`, { params: toQuery({ dosageForm, route }) })
      .then((r) => toAlternatives(r.data)),
}
