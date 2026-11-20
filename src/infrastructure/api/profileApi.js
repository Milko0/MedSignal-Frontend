import { httpClient } from '@/infrastructure/http/httpClient'
import { fromAlertSettings, toAlertSettings } from '@/infrastructure/mappers/profileMapper'
import { toUser } from '@/infrastructure/mappers/userMapper'

const none = () => undefined // password change and delete answer 204

export const profileApi = {
  // FR-14: same UserResponse as register
  get: () => httpClient.get('/profile').then((r) => toUser(r.data)),
  update: ({ username, email }) => httpClient.patch('/profile', { username, email }).then((r) => toUser(r.data)),
  changePassword: ({ currentPassword, newPassword }) =>
    httpClient.post('/profile/password', { current_password: currentPassword, new_password: newPassword }).then(none),
  remove: () => httpClient.delete('/profile').then(none),
  // FR-13: alert settings
  getAlertSettings: () => httpClient.get('/profile/alert-settings').then((r) => toAlertSettings(r.data)),
  saveAlertSettings: (settings) =>
    httpClient.put('/profile/alert-settings', fromAlertSettings(settings)).then((r) => toAlertSettings(r.data)),
}
