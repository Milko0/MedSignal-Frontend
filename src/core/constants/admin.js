// The admin sub-navigation, in tab order. `to` must match a child route of /admin (router/routes.js).
export const ADMIN_SECTIONS = [
  { to: '/admin/ingestion', label: 'Data updates' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/labels', label: 'Labels' },
  { to: '/admin/shortages', label: 'Shortages' },
  { to: '/admin/terms', label: 'Excluded terms' },
]

export const ADMIN_PAGE_SIZE = 20

// While a data update is running, its log is read again this often; after starting one the log is also watched for
// this long even before its entry shows up.
export const RUNS_POLL_MS = 5000
export const RUNS_WATCH_GRACE_MS = 30000
