import axios from 'axios'
import { API_BASE_URL } from '@/core/config/env'
import { tokenStorage } from '@/infrastructure/storage/tokenStorage'

export const httpClient = axios.create({ baseURL: API_BASE_URL, timeout: 30000 })

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) tokenStorage.clear() // the router guard redirects to the login view
    return Promise.reject(error)
  },
)
