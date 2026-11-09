import { httpClient } from '@/infrastructure/http/httpClient'

export const statisticsApi = {
  get: (params) => httpClient.get('/statistics', { params }).then((r) => r.data),
}
