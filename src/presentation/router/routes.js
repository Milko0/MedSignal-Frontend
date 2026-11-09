import AppLayout from '@/presentation/layouts/AppLayout.vue'
import AuthLayout from '@/presentation/layouts/AuthLayout.vue'

// meta.requiresAuth -> redirect guests to /auth ; meta.guestOnly -> redirect logged-in users to /
export const routes = [
  { path: '/auth', component: AuthLayout, meta: { guestOnly: true },
    children: [{ path: '', name: 'auth', component: () => import('@/presentation/views/AuthView.vue') }] },
  { path: '/', component: AppLayout, children: [
    { path: '', name: 'dashboard', component: () => import('@/presentation/views/DashboardView.vue') },
    { path: 'drugs/:rxcui', name: 'drug', component: () => import('@/presentation/views/DrugDetailView.vue'), props: true },
    { path: 'signals', name: 'signals', component: () => import('@/presentation/views/SignalsView.vue') },
    { path: 'my-medicines', name: 'cabinet', component: () => import('@/presentation/views/MedicineCabinetView.vue'), meta: { requiresAuth: true } },
    { path: 'profile', name: 'profile', component: () => import('@/presentation/views/ProfileView.vue'), meta: { requiresAuth: true } },
  ] },
]
