import { httpClient } from '@/infrastructure/http/httpClient'

export const cabinetApi = {
  list: () => httpClient.get('/cabinet').then((r) => r.data),
  follow: (rxcui) => httpClient.post('/cabinet/follows', { rxcui }).then((r) => r.data),
  unfollow: (rxcui) => httpClient.delete(`/cabinet/follows/${rxcui}`).then((r) => r.data),
  alerts: () => httpClient.get('/cabinet/alerts').then((r) => r.data),
  dismiss: (id) => httpClient.delete(`/cabinet/alerts/${id}`).then((r) => r.data),
  dismissAll: () => httpClient.delete('/cabinet/alerts').then((r) => r.data),
}
