// Shortage status as the backend sends it: CURRENT | TO_BE_DISCONTINUED | RESOLVED | null (no record).
export const isInShortage = (status) => status === 'CURRENT' || status === 'TO_BE_DISCONTINUED'

// Palette tone: amber while a drug is (or will be) short, green otherwise.
export const shortageTone = (status) => (isInShortage(status) ? 'amber' : 'green')

const SHORTAGE_LABELS = {
  CURRENT: 'Currently in shortage',
  TO_BE_DISCONTINUED: 'To be discontinued',
  RESOLVED: 'Resolved',
}

export const shortageLabel = (status) => SHORTAGE_LABELS[status] ?? 'No shortage reported'
