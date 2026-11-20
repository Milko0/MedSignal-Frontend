import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'
import { useAuthStore } from '@/application/stores/useAuthStore'
import { profileChanges } from '@/domain/rules/authValidation'
import { settingsChanged } from '@/domain/rules/alertSettings'

// Profile and settings (FR-13, FR-14). The user object itself lives in useAuthStore; this store holds the alert
// settings and the actions of the profile page. The actions that change the account throw the ApiError, so the form
// can show it under the right field; load() never throws.
export const useProfileStore = defineStore('profile', () => {
  const alertSettings = ref(null)      // what the switches edit
  const savedSettings = ref(null)      // what the server has; alertSettings differs from it = unsaved changes
  const loading = ref(false)
  const loadError = ref(null)
  const saving = ref(false)

  // A request already on its way is shared, and a reset (logout, account deleted) drops whatever is still on its way.
  let run = null
  let generation = 0

  const loaded = computed(() => savedSettings.value !== null)
  const hasUnsavedChanges = computed(() => settingsChanged(alertSettings.value, savedSettings.value))
  // The minimum reports the user chose, for the signal explorer's default (null until the settings are known).
  const minReports = computed(() => savedSettings.value?.minReports ?? null)

  function load({ force = false } = {}) {
    if (loaded.value && !force) return Promise.resolve()
    if (run) return run
    const gen = generation
    loading.value = true
    loadError.value = null
    run = services.profile.getAlertSettings()
      .then((settings) => {
        if (gen !== generation) return
        savedSettings.value = { ...settings }
        // a retry must not throw away what the user already changed in the switches
        if (!alertSettings.value) alertSettings.value = { ...settings }
      })
      .catch((e) => { if (gen === generation) loadError.value = e })
      .finally(() => {
        if (gen === generation) { loading.value = false; run = null }
      })
    return run
  }

  // FR-14: sends only the fields that changed, then shows the answer everywhere the user is shown.
  async function updateProfile(form) {
    const auth = useAuthStore()
    const changes = profileChanges(form, auth.user)
    if (!Object.keys(changes).length) return auth.user
    const user = await services.profile.update(changes)
    auth.setUser(user)
    return user
  }

  const changePassword = ({ currentPassword, newPassword }) =>
    services.profile.changePassword({ currentPassword, newPassword })

  // FR-13: explicit save of the whole settings object.
  async function saveSettings() {
    if (!alertSettings.value || saving.value) return
    const gen = generation
    saving.value = true
    try {
      const saved = await services.profile.saveAlertSettings({ ...alertSettings.value })
      if (gen !== generation) return
      savedSettings.value = { ...saved }
      alertSettings.value = { ...saved }
    } finally {
      saving.value = false
    }
  }

  function discardSettings() {
    if (savedSettings.value) alertSettings.value = { ...savedSettings.value }
  }

  // The server revokes the token with the account, so there is no /auth/logout call: the session just ends here.
  async function deleteAccount() {
    await services.profile.remove()
    useAuthStore().endSession()
  }

  function reset() {
    generation++
    run = null
    alertSettings.value = null
    savedSettings.value = null
    loading.value = false
    loadError.value = null
    saving.value = false
  }

  return {
    alertSettings, savedSettings, loading, loadError, saving, loaded, hasUnsavedChanges, minReports,
    load, updateProfile, changePassword, saveSettings, discardSettings, deleteAccount, reset,
  }
})
