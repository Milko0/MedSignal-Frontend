// Statistics -> { groupBy, buckets: [{ group, value }] }
export const toStatistics = (d) => ({
  groupBy: d.group_by,
  buckets: (d.buckets ?? []).map((b) => ({ group: b.group, value: b.value })),
})
