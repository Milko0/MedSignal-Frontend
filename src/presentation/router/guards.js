import { useAuthStore } from '@/application/stores/useAuthStore'

export function installGuards(router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    if (to.meta.requiresAuth && !auth.loggedIn) return { name: 'auth' }
    if (to.meta.guestOnly && auth.loggedIn) return { name: 'dashboard' }
  })
}
