// FR-10: how an alternative is described. Backend enums: match_type SAME_INGREDIENT | SAME_CLASS,
// signal_profile LOW | MODERATE | HIGH (how safety-signal-heavy the alternative is: lower is better).
const MATCH_LABELS = { SAME_INGREDIENT: 'Same ingredient', SAME_CLASS: 'Same class' }
const PROFILE = {
  LOW: { tone: 'green', label: 'Low' },
  MODERATE: { tone: 'amber', label: 'Moderate' },
  HIGH: { tone: 'coral', label: 'High' },
}

export const matchTypeLabel = (type) => MATCH_LABELS[type] ?? type ?? ''
export const signalProfileTone = (profile) => PROFILE[profile]?.tone ?? 'slate'
export const signalProfileLabel = (profile) => PROFILE[profile]?.label ?? profile ?? ''
