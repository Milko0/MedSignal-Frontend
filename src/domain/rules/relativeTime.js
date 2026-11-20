const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// "5 min ago", "2 h ago", "yesterday", "3 days ago" for an ISO timestamp (alerts, FR-18). Pure: `now` is a parameter.
// Under a minute (and timestamps slightly in the future from clock skew) read "just now"; from 30 days on the
// date itself is clearer than a count. An unreadable timestamp gives ''.
export function relativeTime(iso, now = new Date()) {
  if (typeof iso !== 'string' && !(iso instanceof Date)) return ''   // new Date(null) would be 1970
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const elapsed = new Date(now).getTime() - then

  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`
  if (elapsed < 2 * DAY) return 'yesterday'
  if (elapsed < 30 * DAY) return `${Math.floor(elapsed / DAY)} days ago`
  return new Date(then).toISOString().slice(0, 10)
}
