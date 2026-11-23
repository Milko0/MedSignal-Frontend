import { toPage } from './commonMapper'

// SignalRow -> Signal
export const toSignal = (d) => ({
  rxcui: d.rxcui,
  drug: d.drug,
  reaction: d.reaction,
  quarter: d.quarter,
  reports: d.reports,
  a: d.a,
  b: d.b,
  c: d.c,
  d: d.d,
  prr: d.prr,
  ciLower: d.ci_lower,
  chiSquare: d.chi_square,
  isSignal: d.is_signal,
  isEmerging: d.is_emerging,
  labelMatch: d.label_match,
  inShortage: typeof d.in_shortage === 'boolean' ? d.in_shortage : null,   // null: an older backend without the field
  shortageStatus: d.shortage_status ?? null,   // CURRENT | TO_BE_DISCONTINUED | RESOLVED | null (never listed)
  trend: d.trend ?? [],
})

// SignalList (already unwrapped) -> page + the quarter the backend actually used + match coverage
export const toSignalList = (dto) => ({
  ...toPage(dto, toSignal),
  quarter: dto?.quarter ?? null,
  matchCoverage: dto?.match_coverage ?? 0,
})
