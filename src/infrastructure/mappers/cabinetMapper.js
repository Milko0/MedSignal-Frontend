// FollowedDrug -> FollowedDrug model. shortage_status is null when there is no shortage record.
export const toFollowedDrug = (d) => ({
  rxcui: d.rxcui,
  name: d.name,
  shortageStatus: d.shortage_status ?? null,
  packagesInShortage: d.packages_in_shortage ?? 0,
})
