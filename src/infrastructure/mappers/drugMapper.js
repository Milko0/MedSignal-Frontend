// DrugSearchResult -> DrugSearchResult model
export const toSearchResult = (d) => ({
  rxcui: d.rxcui,
  name: d.name,
  brandNames: d.brand_names ?? [],
  matched: d.matched,
  score: d.score,
})

// Drug360Response -> Drug360. Missing data stays null; only list fields default to [] and counters to 0.
export function toDrug360(d) {
  const s = d.shortage ?? {}
  const r = d.recalls ?? {}
  const l = d.label ?? {}
  return {
    rxcui: d.rxcui,
    name: d.name,
    brandNames: d.brand_names ?? [],
    atcClasses: (d.atc_classes ?? []).map((c) => ({ id: c.class_id, name: c.name })),
    selectedDosageForm: d.selected_dosage_form ?? null,
    selectedRoute: d.selected_route ?? null,
    shortage: {
      status: s.status ?? null,
      packagesInShortage: s.packages_in_shortage ?? 0,
      packagesTotal: s.packages_total ?? 0,
      dosageForms: s.dosage_forms ?? [],
      since: s.since ?? null,
      reasons: s.reasons ?? [],
    },
    recalls: {
      classI: r.class_i ?? 0,
      classII: r.class_ii ?? 0,
      classIII: r.class_iii ?? 0,
      notClassified: r.not_classified ?? 0,
      total: r.total ?? 0,
      linkedShare: r.linked_share ?? 0,
    },
    label: {
      available: l.available ?? false,
      productTypes: l.product_types ?? [],
      effectiveDate: l.effective_date ?? null,
      hasBoxedWarning: l.has_boxed_warning ?? false,
      description: l.description ?? null,
    },
    topReactions: (d.top_reactions ?? []).map((x) => ({ reaction: x.reaction, reports: x.reports })),
    isFollowed: d.is_followed ?? false,
    matchCoverage: d.match_coverage ?? 0,
  }
}
