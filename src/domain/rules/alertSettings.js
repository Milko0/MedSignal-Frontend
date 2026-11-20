// FR-13: the alert settings the profile page edits. The four switches and their texts come from the mock-up.
export const ALERT_SWITCHES = [
  { key: 'newSignal', label: 'New safety signal', hint: 'A drug you follow shows a new signal in the reports.' },
  { key: 'labelUpdated', label: 'Label updated', hint: 'The official label of a drug you follow changes.' },
  { key: 'shortageChanged', label: 'Shortage status changes', hint: 'A drug you follow goes into shortage, or the shortage ends.' },
  { key: 'newRecall', label: 'New recall', hint: 'A recall is published for a drug you follow.' },
]

export const defaultAlertSettings = () => ({
  newSignal: true, labelUpdated: true, shortageChanged: true, newRecall: true, minReports: 20,
})

// True when the edited settings differ from the saved ones (drives "Save settings" and the unsaved-changes note).
export function settingsChanged(edited, saved) {
  if (!edited || !saved) return false
  return Object.keys(defaultAlertSettings()).some((key) => edited[key] !== saved[key])
}
