import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { services } from '@/composition/container'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loggedIn = computed(() => services.auth.hasToken())
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(form) { user.value = await services.auth.login(form) }
  async function register(form) { user.value = await services.auth.register(form) }
  function logout() { services.auth.logout(); user.value = null }

  return { user, loggedIn, isAdmin, login, register, logout }
})
