import AppLayout from '@/presentation/layouts/AppLayout.vue'
import AuthLayout from '@/presentation/layouts/AuthLayout.vue'
import AdminLayout from '@/presentation/layouts/AdminLayout.vue'

// meta.requiresAuth -> redirect guests to /login ; meta.guestOnly -> redirect logged-in users to /
// meta.requiresAdmin -> logged-in users who are not admins are sent to the dashboard ; meta.wide -> wider page (admin tables)
// meta.title -> browser tab title (router/titles.js); the drug page replaces it with the drug name once loaded.
export const routes = [
  { path: '/login', component: AuthLayout, meta: { guestOnly: true },
    children: [{ path: '', name: 'login', component: () => import('@/presentation/views/LoginView.vue'), meta: { title: 'Log in' } }] },
  { path: '/register', component: AuthLayout, meta: { guestOnly: true },
    children: [{ path: '', name: 'register', component: () => import('@/presentation/views/RegisterView.vue'), meta: { title: 'Create account' } }] },
  // Old address of the combined page: keep links and bookmarks working (the query, e.g. ?redirect=, is kept).
  { path: '/auth', redirect: (to) => ({ name: 'login', query: to.query }) },
  { path: '/', component: AppLayout, children: [
    { path: '', name: 'dashboard', component: () => import('@/presentation/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
    { path: 'drugs/:rxcui', name: 'drug', component: () => import('@/presentation/views/DrugDetailView.vue'), props: true, meta: { title: 'Drug details' } },
    { path: 'signals', name: 'signals', component: () => import('@/presentation/views/SignalsView.vue'), meta: { title: 'Signals & statistics' } },
    { path: 'my-medicines', name: 'cabinet', component: () => import('@/presentation/views/MedicineCabinetView.vue'), meta: { requiresAuth: true, title: 'My medicines' } },
    { path: 'profile', name: 'profile', component: () => import('@/presentation/views/ProfileView.vue'), meta: { requiresAuth: true, title: 'Profile and settings' } },
    // Administration (FR-19 to FR-27). Child routes are added with their views; meta is inherited by every child.
    { path: 'admin', component: AdminLayout, meta: { requiresAuth: true, requiresAdmin: true, wide: true }, children: [
      { path: '', redirect: { name: 'admin-users' } },
      { path: 'users', name: 'admin-users', component: () => import('@/presentation/views/AdminUsersView.vue'), meta: { title: 'Admin: users' } },
      { path: 'shortages', name: 'admin-shortages', component: () => import('@/presentation/views/AdminShortagesView.vue'), meta: { title: 'Admin: shortages' } },
      { path: 'terms', name: 'admin-terms', component: () => import('@/presentation/views/AdminTermsView.vue'), meta: { title: 'Admin: excluded terms' } },
      { path: 'reports', name: 'admin-reports', component: () => import('@/presentation/views/AdminReportsView.vue'), meta: { title: 'Admin: reports' } },
      { path: 'labels', name: 'admin-labels', component: () => import('@/presentation/views/AdminLabelsView.vue'), meta: { title: 'Admin: labels' } },
    ] },
    // Must stay last: any other path shows the not-found page instead of an empty screen.
    { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/presentation/views/NotFoundView.vue'), meta: { title: 'Page not found' } },
  ] },
]
