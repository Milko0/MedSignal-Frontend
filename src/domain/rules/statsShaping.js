// FR-08: reshaping of GET /statistics buckets for the filters and the charts. Buckets look like
// { group: 'FEMALE' | '2026Q3' | ..., value: number } and the groups are the backend's raw enums.

const QUARTER = /^\d{4}Q[1-4]$/

// Quarter names of a `group_by=quarter` answer, newest first (the quarter dropdown; backend request B3 is the
// fallback this replaces). Anything that is not a quarter is dropped.
export function quartersFromBuckets(buckets) {
  return [...new Set((buckets ?? []).map((b) => b?.group).filter((g) => typeof g === 'string' && QUARTER.test(g)))]
    .sort()
    .reverse()
}

// Display text of a raw bucket / report enum. Only the known enums are rewritten; age ranges (`65-74`), country
// codes (`US`) and anything new pass through unchanged.
const GROUP_LABELS = { UNKNOWN: 'Unknown', FEMALE: 'Female', MALE: 'Male', SERIOUS: 'Serious', NON_SERIOUS: 'Non-serious' }
export const groupLabel = (group) => GROUP_LABELS[group] ?? group ?? ''

export const AGE_ORDER = ['0-17', '18-44', '45-64', '65-74', '75+']
const SEX_ORDER = ['FEMALE', 'MALE']

// Buckets -> { group: value } in a stable order: the groups of `order` first (when present), then the rest
// alphabetically, UNKNOWN always last. Repeated groups are added up; non-numeric values count as 0.
export function bucketsToMap(buckets, order = []) {
  const totals = new Map()
  for (const b of buckets ?? []) {
    if (typeof b?.group !== 'string') continue
    totals.set(b.group, (totals.get(b.group) ?? 0) + (Number(b.value) || 0))
  }
  const rank = (g) => (g === 'UNKNOWN' ? Infinity : order.includes(g) ? order.indexOf(g) : order.length)
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)))
}

// Reports by age group for the bar chart: 0-17 ... 75+, then Unknown. Keys are display labels.
export function ageGroups(buckets) {
  return Object.fromEntries(Object.entries(bucketsToMap(buckets, AGE_ORDER)).map(([g, v]) => [groupLabel(g), v]))
}

// Reports by sex as percentages with one decimal that add up to exactly 100.0 (largest remainder method), so the
// donut never shows 99.9 or 100.1. No reports -> {}.
export function sexShares(buckets) {
  const map = bucketsToMap(buckets, SEX_ORDER)
  const entries = Object.entries(map)
  const total = entries.reduce((sum, [, v]) => sum + v, 0)
  if (total <= 0) return {}

  const tenths = entries.map(([group, v]) => {
    const exact = (v / total) * 1000
    return { group, floor: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  let missing = 1000 - tenths.reduce((sum, t) => sum + t.floor, 0)
  for (const t of [...tenths].sort((a, b) => b.rest - a.rest)) {
    if (missing <= 0) break
    t.floor += 1
    missing -= 1
  }
  return Object.fromEntries(tenths.map((t) => [groupLabel(t.group), t.floor / 10]))
}

// The last `n` quarters of a `group_by=quarter` answer, oldest first (the order of a time axis).
export function lastQuarters(buckets, n = 6) {
  return quartersFromBuckets(buckets).slice(0, n).reverse()
}

// "Serious reports over time" for TrendChart: all reports per quarter and the serious ones, on the same axis.
// `seriousByQuarter` is { '2026Q3': 10806, ... }; a quarter that is missing there (its request failed) is `null`, so
// the line breaks instead of dropping to a false 0.
export function seriousSeries(allByQuarter, seriousByQuarter, last = 6) {
  const quarters = lastQuarters(allByQuarter, last)
  if (!quarters.length) return []
  const all = bucketsToMap(allByQuarter)
  return [
    { reaction: 'All reports', months: quarters, counts: quarters.map((q) => all[q] ?? null) },
    { reaction: 'Serious', months: quarters, counts: quarters.map((q) => (Number.isFinite(seriousByQuarter?.[q]) ? seriousByQuarter[q] : null)) },
  ]
}
