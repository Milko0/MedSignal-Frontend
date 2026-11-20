import axios from 'axios'
import { API_BASE_URL } from '@/core/config/env'
import { toApiError } from './apiError'

export { ApiError } from './apiError'

// The client knows nothing about where the token lives or what a 401 means for the session:
// the composition root plugs both in with configureHttp().
let getToken = () => null
let onUnauthorized = () => {}

export function configureHttp(options = {}) {
  if (options.getToken) getToken = options.getToken
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized
}

export const httpClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 })

httpClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error)
    if (apiError.status === 401) onUnauthorized(apiError)
    return Promise.reject(apiError)
  },
)
