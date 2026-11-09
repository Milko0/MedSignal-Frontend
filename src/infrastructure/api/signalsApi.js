import { httpClient } from '@/infrastructure/http/httpClient'

export const signalsApi = {
  list: (params) => httpClient.get('/signals', { params }).then((r) => r.data),
  emerging: (params) => httpClient.get('/signals/emerging', { params }).then((r) => r.data),
  reports: (rxcui, reaction, params) => httpClient.get(`/signals/${rxcui}/${reaction}/reports`, { params }).then((r) => r.data),
}
