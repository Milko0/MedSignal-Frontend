// FR-06: the latest value must sit clearly above the baseline of earlier quarters.
export function isEmerging(latest, baseline, margin = 0.5) {
  if (!baseline.length) return false
  return latest >= baseline.reduce((a, b) => a + b, 0) / baseline.length + margin
}
