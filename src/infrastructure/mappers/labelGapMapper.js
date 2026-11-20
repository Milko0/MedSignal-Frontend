// LabelGapsData (already unwrapped from the envelope) -> LabelGaps
export const toLabelGaps = (d) => ({
  labelAvailable: d.label_available,
  comparable: d.comparable ?? true,
  note: d.note ?? null,
  gaps: (d.gaps ?? []).map((g) => ({
    reaction: g.reaction,
    reports: g.reports,
    matchLevel: g.match_level,
    inIndications: g.in_indications ?? false,
  })),
})
