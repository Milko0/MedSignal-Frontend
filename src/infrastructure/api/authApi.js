import { httpClient } from '@/infrastructure/http/httpClient'
import { toUser } from '@/infrastructure/mappers/userMapper'

export const authApi = {
  // FR-11: register returns the new user, no token (log in afterwards)
  register: ({ username, email, password }) =>
    httpClient.post('/auth/register', { username, email, password }).then((r) => toUser(r.data)),
  // FR-12: login takes username OR email as `identifier` and returns only the token
  login: ({ identifier, password }) =>
    httpClient.post('/auth/login', { identifier, password }).then((r) => ({ accessToken: r.data.access_token })),
  // revokes the bearer token on the server (204)
  logout: () => httpClient.post('/auth/logout').then(() => undefined),
}
