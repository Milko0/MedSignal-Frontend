import { tokenStorage } from '@/infrastructure/storage/tokenStorage'

export function createAuthService(api) {
  const store = async (res) => { tokenStorage.set(res.access_token); return res.user }
  return {
    register: (form) => api.register(form).then(store),
    login: (form) => api.login(form).then(store),
    logout: () => tokenStorage.clear(),
    hasToken: () => !!tokenStorage.get(),
  }
}
