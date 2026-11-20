// AlertSettingsDto <-> AlertSettings
export const toAlertSettings = (d) => ({
  newSignal: d.new_signal ?? true,
  labelUpdated: d.label_updated ?? true,
  shortageChanged: d.shortage_changed ?? true,
  newRecall: d.new_recall ?? true,
  minReports: d.min_reports ?? 20,
})

export const fromAlertSettings = (m) => ({
  new_signal: m.newSignal,
  label_updated: m.labelUpdated,
  shortage_changed: m.shortageChanged,
  new_recall: m.newRecall,
  min_reports: m.minReports,
})
