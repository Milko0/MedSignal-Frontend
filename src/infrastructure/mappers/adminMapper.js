// Admin DTOs -> models. Reports, labels and shortages are NOT mapped on purpose: the admin edits them as documents.

// IngestionRunDto
export const toRun = (d) => ({
  id: d.run_id,
  type: d.type,
  source: d.source,
  sourceLastUpdated: d.source_last_updated ?? null,
  startedAt: d.started_at,
  endedAt: d.ended_at ?? null,
  recordsLoaded: d.records_loaded ?? 0,
  recordsSkipped: d.records_skipped ?? 0,
  errors: d.errors ?? [],
  stats: d.stats ?? {},
})

// FaersFileDto
export const toFaersFile = (d) => ({
  name: d.name,
  quarter: d.quarter ?? null,
  sizeMb: d.size_mb,
  modifiedAt: d.modified_at,
  quarterLoaded: Boolean(d.quarter_loaded),
})

// LoadedQuartersDto
export const toLoadedQuarters = (d) => ({
  windowQuarters: d.window_quarters,
  quarters: d.quarters ?? [],
  adding: d.adding ?? null,
  wouldDrop: d.would_drop ?? [],
})

// IngestionStarted
export const toJobStarted = (d) => ({ job: d.job, status: d.status, detail: d.detail })
