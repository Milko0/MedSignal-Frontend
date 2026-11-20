// Maps a PRR value to a severity tone used by PRRBadge.
export function signalSeverity(prr) {
  if (prr >= 3) return 'high'
  if (prr >= 2) return 'medium'
  return 'low'
}

// Label column of the signal table: is the reaction in the official label text? (FULL | PARTIAL | NONE)
const LABEL_MATCH = { FULL: 'Listed', PARTIAL: 'Partly listed', NONE: 'Not listed' }
export const labelMatchLabel = (match) => LABEL_MATCH[match] ?? 'Unknown'
