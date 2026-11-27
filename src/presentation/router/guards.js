import { useAuthStore } from '@/application/stores/useAuthStore'

export function installGuards(router) {
  router.beforeEach((to) => {
    const auth = useAuthStore()
    // Remember where the guest wanted to go; LoginView sends them back after logging in.
    if (to.meta.requiresAuth && !auth.loggedIn) return { name: 'login', query: { redirect: to.fullPath } }
    // Admin screens: a logged-in user who is not an admin goes to the dashboard (the API answers 403 anyway).
    if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'dashboard' }
    if (to.meta.guestOnly && auth.loggedIn) return { name: 'dashboard' }
  })
}
