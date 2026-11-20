// AlertItem -> Alert. type is SIGNAL | LABEL | SHORTAGE | RECALL.
export const toAlert = (d) => ({
  id: d.alert_id,
  type: d.type,
  rxcui: d.drug_rxcui,
  message: d.message,
  createdAt: d.created_at,
})
