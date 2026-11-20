import { httpClient } from '@/infrastructure/http/httpClient'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'

const none = () => undefined // follow / unfollow / dismiss answer 204

export const cabinetApi = {
  // FR-16: plain array of followed drugs
  list: () => httpClient.get('/cabinet').then((r) => r.data.map(toFollowedDrug)),
  // FR-15
  follow: (rxcui) => httpClient.post('/cabinet/follows', { rxcui }).then(none),
  unfollow: (rxcui) => httpClient.delete(`/cabinet/follows/${encodeURIComponent(rxcui)}`).then(none),
  // FR-17: plain array of alerts
  alerts: () => httpClient.get('/cabinet/alerts').then((r) => r.data.map(toAlert)),
  // FR-18
  dismiss: (id) => httpClient.delete(`/cabinet/alerts/${encodeURIComponent(id)}`).then(none),
  dismissAll: () => httpClient.delete('/cabinet/alerts').then(none),
}
