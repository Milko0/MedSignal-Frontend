// Alert types as the backend sends them: SIGNAL | SHORTAGE | LABEL | RECALL.
const ALERTS = {
  SIGNAL: { tone: 'coral', label: 'New signal' },
  SHORTAGE: { tone: 'amber', label: 'Shortage' },
  LABEL: { tone: 'teal', label: 'Label updated' },
  RECALL: { tone: 'slate', label: 'New recall' },
}

export const alertTone = (type) => ALERTS[type]?.tone ?? 'slate'
export const alertLabel = (type) => ALERTS[type]?.label ?? type
