// 0.171 -> '17%'. Shares come from the backend as 0..1 (match_coverage, linked_share). Unusable input gives ''.
export function formatPercent(share) {
  if (typeof share !== 'number' || !Number.isFinite(share)) return ''
  return `${Math.round(Math.min(Math.max(share, 0), 1) * 100)}%`
}
