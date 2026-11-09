import { httpClient } from '@/infrastructure/http/httpClient'

export const profileApi = {
  get: () => httpClient.get('/profile').then((r) => r.data),
  update: (body) => httpClient.patch('/profile', body).then((r) => r.data),
  changePassword: (body) => httpClient.post('/profile/password', body).then((r) => r.data),
  remove: () => httpClient.delete('/profile').then((r) => r.data),
  getAlertSettings: () => httpClient.get('/profile/alert-settings').then((r) => r.data),
  saveAlertSettings: (body) => httpClient.put('/profile/alert-settings', body).then((r) => r.data),
}
