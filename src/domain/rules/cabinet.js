// FR-16, FR-17: how the followed drugs and their alerts become the rows of "My medicines".
// The backend sends two plain lists (followed drugs with their shortage status, alerts with a drug rxcui) and no
// per-drug "latest event" (backend request B5), so the row is built here: a drug's status is its newest alert, else
// its shortage status, else "No changes".
import { alertLabel, alertTone } from './alertTone'
import { isInShortage, shortageLabel } from './shortageStatus'

export const ALERT_TYPES = ['SHORTAGE', 'SIGNAL', 'LABEL', 'RECALL']

// Filter chips of the cabinet. `types` are the alert types a row must have (any of them).
export const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'SHORTAGE', label: 'Shortage' },
  { key: 'SIGNAL', label: 'Signals' },
  { key: 'LABEL', label: 'Label' },
  { key: 'RECALL', label: 'Recalls' },
]

const time = (alert) => {
  const t = Date.parse(alert?.createdAt)
  return Number.isNaN(t) ? -Infinity : t
}

// Newest first; alerts with an unreadable date go last. Returns a copy, the stable order of equal times is kept.
export const sortAlerts = (alerts) => [...(alerts ?? [])].sort((a, b) => time(b) - time(a))

// rxcui -> that drug's alerts, newest first
export function alertsByRxcui(alerts) {
  const byDrug = new Map()
  for (const alert of sortAlerts(alerts)) {
    if (!byDrug.has(alert.rxcui)) byDrug.set(alert.rxcui, [])
    byDrug.get(alert.rxcui).push(alert)
  }
  return byDrug
}

// rxcui -> the newest alert of that drug
export function latestAlertByRxcui(alerts) {
  return new Map([...alertsByRxcui(alerts)].map(([rxcui, list]) => [rxcui, list[0]]))
}

// What the status chip of a row says and in which colour.
//   newest alert        SHORTAGE amber, SIGNAL coral, LABEL teal, RECALL slate (an unknown type: slate, its own name)
//   no alert, shortage  amber, "Currently in shortage" / "To be discontinued"
//   no alert, resolved  green, "Resolved"
//   nothing             green, "No changes"
export function rowStatus(drug, alert) {
  if (alert) return { kind: alert.type, label: alertLabel(alert.type), tone: alertTone(alert.type) }
  const status = drug?.shortageStatus ?? null
  if (isInShortage(status)) return { kind: 'SHORTAGE', label: shortageLabel(status), tone: 'amber' }
  if (status === 'RESOLVED') return { kind: 'NONE', label: shortageLabel(status), tone: 'green' }
  return { kind: 'NONE', label: 'No changes', tone: 'green' }
}

// Does a row belong under this chip? ALL: every row. SHORTAGE: an alert of that type, or the drug is in shortage right
// now even without an alert. The others: the drug has an alert of that type (not only a newest one).
export function matchesFilter(row, filter) {
  if (filter === 'ALL') return true
  if (row.alerts.some((a) => a.type === filter)) return true
  return filter === 'SHORTAGE' && isInShortage(row.shortageStatus)
}

// Followed drugs + alerts -> rows, attention first: drugs with alerts (newest alert first), then drugs in shortage,
// then the rest by name.
export function buildRows(followed, alerts) {
  const byDrug = alertsByRxcui(alerts)
  return (followed ?? [])
    .map((drug) => {
      const own = byDrug.get(drug.rxcui) ?? []
      return { ...drug, alert: own[0] ?? null, alerts: own, status: rowStatus(drug, own[0]) }
    })
    .sort((a, b) => {
      if (!!a.alert !== !!b.alert) return a.alert ? -1 : 1
      if (a.alert && b.alert) return time(b.alert) - time(a.alert)
      if (isInShortage(a.shortageStatus) !== isInShortage(b.shortageStatus)) return isInShortage(a.shortageStatus) ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}
