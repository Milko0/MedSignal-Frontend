import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { useCabinetStore } from '@/application/stores/useCabinetStore'
import { useProfileStore } from '@/application/stores/useProfileStore'
import { resetAdminStores } from '@/application/stores/useAdminStores'
import { FORM_401_PATHS } from '@/core/constants/auth'

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
    useProfileStore().reset()
    resetAdminStores()
  }

  // Shown to the whole app after the profile page changed the user (new username or email).
  const setUser = (value) => { user.value = value }

  // Ends the session here only, without calling /auth/logout: for a token the server has already revoked or dropped
  // (account deleted, expired session).
  function endSession() {
    services.auth.clearSession()
    resetSession()
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

  // Called by the HTTP client on every 401. Returns true when it ended a session, so the caller (main.js)
  // knows to send the user to the login screen. A 401 that answers a form (wrong login or current password, token
  // already revoked on logout, see FORM_401_PATHS) is not an expired session, and a guest has no session to end.
  function handleUnauthorized(error) {
    if (!hasToken.value) return false
    if (FORM_401_PATHS.some((path) => error?.url?.endsWith(path))) return false
    endSession()
    return true
  }

  return { user, loggedIn, isAdmin, initials, login, register, restore, logout, setUser, endSession, handleUnauthorized }
})
