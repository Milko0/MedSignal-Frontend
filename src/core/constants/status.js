// Palette semantics from the mock-ups: teal = actions, amber = shortage, coral = safety signal, green = available.
export const STATUS = {
  in_shortage: { label: 'In shortage', tone: 'amber' },
  new_signal: { label: 'New signal', tone: 'coral' },
  label_updated: { label: 'Label updated', tone: 'teal' },
  new_recall: { label: 'New recall', tone: 'slate' },
  no_changes: { label: 'No changes', tone: 'green' },
  available: { label: 'Available', tone: 'green' },
}
