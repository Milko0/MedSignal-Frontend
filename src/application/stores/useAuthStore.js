import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { useCabinetStore } from '@/application/stores/useCabinetStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  // The token itself stays in the session storage behind the service; the store only mirrors "is there one"
  // so that loggedIn is reactive (a plain function call would not re-render the navbar or re-run guards).
  const hasToken = ref(!!services.auth.hasToken())
  const loggedIn = computed(() => hasToken.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const initials = computed(() => (user.value?.username ?? '').slice(0, 2).toUpperCase() || 'ME')

  const syncToken = () => { hasToken.value = !!services.auth.hasToken() }

  // User-scoped state of other stores must not survive a logout or an expired session.
  function resetSession() {
    user.value = null
    hasToken.value = false
    useCabinetStore().reset()
  }

  // login and register throw the ApiError so the form can show it; the token flag is synced either way.
  async function login(form) {
    try {
      user.value = await services.auth.login(form)
    } finally {
      syncToken()
    }
  }

  async function register(form) {
    try {
      user.value = await services.auth.register(form)
    } finally {
      syncToken()
    }
  }

  // Called once before the app mounts. A rejected token leaves us as a guest; a network failure keeps the token.
  async function restore() {
    if (!services.auth.hasToken()) return
    try {
      user.value = await services.auth.restore()
    } catch {
      // server unreachable: keep the token, the next page load tries again
    }
    syncToken()
  }

  async function logout() {
    try {
      await services.auth.logout()
    } finally {
      resetSession()
    }
  }

  return { user, loggedIn, isAdmin, initials, login, register, restore, logout }
})
