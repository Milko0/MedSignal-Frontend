// 0.171 -> '17%'. Shares come from the backend as 0..1 (match_coverage, linked_share). Unusable input gives ''.
// A share below 1 never shows as 100% (0.999 -> '99%'): "everything" would overstate how complete the data is.
export function formatPercent(share) {
  if (typeof share !== 'number' || !Number.isFinite(share)) return ''
  const clamped = Math.min(Math.max(share, 0), 1)
  const percent = Math.round(clamped * 100)
  return `${clamped < 1 ? Math.min(percent, 99) : percent}%`
}
