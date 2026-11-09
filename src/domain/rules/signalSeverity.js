// Maps a PRR value to a severity tone used by PRRBadge.
export function signalSeverity(prr) {
  if (prr >= 3) return 'high'
  if (prr >= 2) return 'medium'
  return 'low'
}
