export const toSignal = (d) => ({
  rxcui: d.rxcui, drug: d.drug, reaction: d.reaction, reports: d.reports, prr: d.prr, ciLower: d.ci_lower,
  chiSquare: d.chi_square, inLabel: d.in_label, novelty: d.novelty, trend: d.trend ?? [],
})
