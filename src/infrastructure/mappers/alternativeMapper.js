// AlternativesData -> Alternatives
export const toAlternatives = (d) => ({
  targetDosageForm: d.target_dosage_form ?? null,
  targetRoutes: d.target_routes ?? [],
  items: (d.items ?? []).map((a) => ({
    matchType: a.match_type,
    rxcui: a.rxcui,
    name: a.name,
    dosageForm: a.dosage_form ?? null,
    routes: a.routes ?? [],
    recalls: a.recalls ?? 0,
    signalProfile: a.signal_profile,
    productsAvailable: a.products_available ?? 0,
    rank: a.rank ?? 0,
  })),
})
