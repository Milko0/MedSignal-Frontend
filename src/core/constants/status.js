// Palette semantics from the mock-ups: teal = actions, amber = shortage, coral = safety signal, green = available.
// Keys are either the UI states below or the raw backend enums, so a chip can be fed the API value directly.
// The backend-enum entries mirror domain/rules/shortageStatus.js and alertTone.js (a test keeps them in sync).
export const STATUS = {
  in_shortage: { label: 'In shortage', tone: 'amber' },
  new_signal: { label: 'New signal', tone: 'coral' },
  label_updated: { label: 'Label updated', tone: 'teal' },
  new_recall: { label: 'New recall', tone: 'slate' },
  no_changes: { label: 'No changes', tone: 'green' },
  available: { label: 'Available', tone: 'green' },

  // shortage status
  CURRENT: { label: 'Currently in shortage', tone: 'amber' },
  TO_BE_DISCONTINUED: { label: 'To be discontinued', tone: 'amber' },
  RESOLVED: { label: 'Resolved', tone: 'green' },

  // alert type
  SIGNAL: { label: 'New signal', tone: 'coral' },
  SHORTAGE: { label: 'Shortage', tone: 'amber' },
  LABEL: { label: 'Label updated', tone: 'teal' },
  RECALL: { label: 'New recall', tone: 'slate' },
}
