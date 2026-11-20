// Maps a PRR value to a severity tone used by PRRBadge.
export function signalSeverity(prr) {
  if (prr >= 3) return 'high'
  if (prr >= 2) return 'medium'
  return 'low'
}

// Label column of the signal table: is the reaction in the official label text? (FULL | PARTIAL | NONE)
const LABEL_MATCH = { FULL: 'Listed', PARTIAL: 'Partly listed', NONE: 'Not listed' }
export const labelMatchLabel = (match) => LABEL_MATCH[match] ?? 'Unknown'

// PRR badge colour: high coral, medium amber, low slate (below the Evans PRR threshold of 2).
const SEVERITY_TONE = { high: 'coral', medium: 'amber', low: 'slate' }
export const severityTone = (prr) => SEVERITY_TONE[signalSeverity(prr)]

// Label chip colour: in the label green, partly amber, missing from the label coral (a label gap).
const LABEL_MATCH_TONE = { FULL: 'green', PARTIAL: 'amber', NONE: 'coral' }
export const labelMatchTone = (match) => LABEL_MATCH_TONE[match] ?? 'slate'
