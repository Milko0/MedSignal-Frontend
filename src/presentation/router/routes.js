import AppLayout from '@/presentation/layouts/AppLayout.vue'
import AuthLayout from '@/presentation/layouts/AuthLayout.vue'

// meta.requiresAuth -> redirect guests to /auth ; meta.guestOnly -> redirect logged-in users to /
// meta.title -> browser tab title (router/titles.js); the drug page replaces it with the drug name once loaded.
export const routes = [
  { path: '/auth', component: AuthLayout, meta: { guestOnly: true },
    children: [{ path: '', name: 'auth', component: () => import('@/presentation/views/AuthView.vue'), meta: { title: 'Log in' } }] },
  { path: '/', component: AppLayout, children: [
    { path: '', name: 'dashboard', component: () => import('@/presentation/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
    { path: 'drugs/:rxcui', name: 'drug', component: () => import('@/presentation/views/DrugDetailView.vue'), props: true, meta: { title: 'Drug details' } },
    { path: 'signals', name: 'signals', component: () => import('@/presentation/views/SignalsView.vue'), meta: { title: 'Signals & statistics' } },
    { path: 'my-medicines', name: 'cabinet', component: () => import('@/presentation/views/MedicineCabinetView.vue'), meta: { requiresAuth: true, title: 'My medicines' } },
    { path: 'profile', name: 'profile', component: () => import('@/presentation/views/ProfileView.vue'), meta: { requiresAuth: true, title: 'Profile and settings' } },
    // Must stay last: any other path shows the not-found page instead of an empty screen.
    { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/presentation/views/NotFoundView.vue'), meta: { title: 'Page not found' } },
  ] },
]
