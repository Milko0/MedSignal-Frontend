import { isInShortage, shortageLabel, shortageTone } from './shortageStatus'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// '2026-09-12' -> '12 Sep 2026'. Read from the text, not through Date, so the time zone cannot move the day.
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return ''
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}

// FR-02: what the shortage card prints. `shortage` is the Drug360 model's shortage block (status null = no record).
//   { tone, title, subtitle }
//   CURRENT            amber  "Currently in shortage"   "Since 12 Sep 2026 · 3 of 12 packages affected"
//   TO_BE_DISCONTINUED amber  "To be discontinued"      same subtitle
//   RESOLVED           green  "Resolved"                "Listed since 12 Sep 2026"
//   null               green  "No shortage reported"    ""
export function formatShortage(shortage) {
  const status = shortage?.status ?? null
  const since = formatDate(shortage?.since)
  const parts = []

  if (isInShortage(status)) {
    if (since) parts.push(`Since ${since}`)
    const total = shortage.packagesTotal ?? 0
    if (total > 0) parts.push(`${shortage.packagesInShortage ?? 0} of ${total} ${total === 1 ? 'package' : 'packages'} affected`)
  } else if (status === 'RESOLVED' && since) {
    parts.push(`Listed since ${since}`)
  }

  return { tone: shortageTone(status), title: shortageLabel(status), subtitle: parts.join(' · ') }
}
