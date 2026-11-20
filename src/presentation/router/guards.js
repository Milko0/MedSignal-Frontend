import { useAuthStore } from '@/application/stores/useAuthStore'

export function installGuards(router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    // Remember where the guest wanted to go; AuthView sends them back after logging in.
    if (to.meta.requiresAuth && !auth.loggedIn) return { name: 'auth', query: { redirect: to.fullPath } }
    if (to.meta.guestOnly && auth.loggedIn) return { name: 'dashboard' }
  })
}
