import { httpClient } from '@/infrastructure/http/httpClient'

export const authApi = {
  register: (body) => httpClient.post('/auth/register', body).then((r) => r.data),
  login: (body) => httpClient.post('/auth/login', body).then((r) => r.data),
}
