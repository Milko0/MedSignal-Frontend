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

// The backend writes a job's log entry only when the job FINISHES, so a running job is invisible in the log. After a
// trigger the screen therefore remembers which job it is waiting for and reads the log this often until a new entry of
// that kind appears, giving up after RUNS_WATCH_MAX_MS (a long FAERS load can take many minutes).
export const RUNS_POLL_MS = 5000
export const RUNS_WATCH_MAX_MS = 60 * 60 * 1000

// Which log entry ends which trigger. (The incremental update logs its shortage poll first and the labels/recalls entry
// last; the entry of type INCREMENTAL is the end of the whole job.)
export const JOB_FINISHED_BY = { faers: ['FULL_LOAD'], incremental: ['INCREMENTAL'] }
export const JOB_NAMES = { faers: 'FAERS load', incremental: 'Update of shortages, labels and recalls' }
