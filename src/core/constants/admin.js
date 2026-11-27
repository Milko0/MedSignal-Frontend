// The admin sub-navigation, in tab order. `to` must match a child route of /admin (router/routes.js).
export const ADMIN_SECTIONS = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/labels', label: 'Labels' },
  { to: '/admin/shortages', label: 'Shortages' },
  { to: '/admin/terms', label: 'Excluded terms' },
]

export const ADMIN_PAGE_SIZE = 20
