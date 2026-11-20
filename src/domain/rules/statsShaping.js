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
