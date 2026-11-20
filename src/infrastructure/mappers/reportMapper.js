// ReportBrief -> ReportBrief model. The backend calls the id `report_id`.
export const toReportBrief = (d) => ({
  id: d.report_id,
  receiveDate: d.receive_date,
  serious: d.serious ?? null,
  ageGroup: d.age_group,
  sex: d.sex,
  country: d.country ?? null,
  reactions: d.reactions ?? [],
  suspectDrugs: d.suspect_drugs ?? [],
})
