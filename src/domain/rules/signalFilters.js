// FR-04, FR-05, FR-06, FR-07: the filters of the signal explorer and their mapping to the URL query. The URL is the
// source of truth (links from the dashboard, back/forward, copy-paste all work):
//   /signals?tab=all|emerging|gaps&rxcui=&drug=&reaction=&quarter=&min=&all=1&page=
// Only values that differ from the defaults are written, so a plain visit stays `/signals`.

export const TABS = ['all', 'emerging', 'gaps']
export const PAGE_SIZE = 10
export const MIN_REPORT_OPTIONS = [3, 5, 10, 20, 50, 100]

// The backend's own defaults: the explorer asks for 20 reports, the emerging list for 3. A `min` that was not set
// explicitly follows the tab, so the dashboard's emerging card and the Emerging tab show the same list.
const DEFAULT_MIN = { all: 20, emerging: 3, gaps: 20 }
export const defaultMinReports = (tab) => DEFAULT_MIN[tab] ?? DEFAULT_MIN.all

// Which filters each tab actually sends to the backend (the others are shown disabled):
//   all      GET /signals                      drug, reaction, quarter, min reports, "show all pairs"
//   emerging GET /signals/emerging             quarter, min reports
//   gaps     GET /drugs/{rxcui}/label-gaps     drug (required), min reports
export const FILTERS_BY_TAB = {
  all: ['drug', 'reaction', 'quarter', 'min', 'pairs'],
  emerging: ['quarter', 'min'],
  gaps: ['drug', 'min'],
}
export const filterApplies = (tab, filter) => (FILTERS_BY_TAB[tab] ?? FILTERS_BY_TAB.all).includes(filter)

export const defaultFilters = () => ({
  tab: 'all',
  rxcui: null,
  drugName: null,        // display only
  reaction: '',
  quarter: null,         // null = latest (the response says which)
  minReports: null,      // null = the tab's default
  onlySignals: true,     // false = also pairs that do not meet the Evans criteria
  page: 1,
  pageSize: PAGE_SIZE,
})

export const effectiveMinReports = (filters) => filters.minReports ?? defaultMinReports(filters.tab)

const first = (value) => (Array.isArray(value) ? value[0] : value)
const text = (value, max) => {
  const v = typeof first(value) === 'string' ? first(value).trim() : ''
  return v && v.length <= max ? v : ''
}
const positiveInt = (value, max = 1_000_000) => {
  const v = first(value)
  if (typeof v !== 'string' || !/^\d+$/.test(v)) return null
  const n = Number(v)
  return n >= 1 && n <= max ? n : null
}

// Anything that is not understood falls back to its default instead of failing, so a hand-edited or old link still opens.
export function filtersFromQuery(query = {}) {
  const f = defaultFilters()
  const tab = first(query.tab)
  if (TABS.includes(tab)) f.tab = tab

  const rxcui = text(query.rxcui, 32)
  if (/^[A-Za-z0-9_-]+$/.test(rxcui)) {
    f.rxcui = rxcui
    f.drugName = text(query.drug, 120) || null
  }
  f.reaction = text(query.reaction, 200)

  const quarter = text(query.quarter, 6).toUpperCase()
  if (/^\d{4}Q[1-4]$/.test(quarter)) f.quarter = quarter

  f.minReports = positiveInt(query.min)
  const all = first(query.all)
  f.onlySignals = !(all === '1' || all === 'true')
  f.page = positiveInt(query.page) ?? 1
  return f
}

// Filters -> query object (strings only), defaults left out. Fields a tab does not use are left out too, so
// switching tab does not carry a drug into the Emerging tab where it would silently do nothing.
export function queryFromFilters(filters) {
  const f = { ...defaultFilters(), ...filters }
  const query = {}
  if (f.tab !== 'all') query.tab = f.tab
  if (filterApplies(f.tab, 'drug') && f.rxcui) {
    query.rxcui = String(f.rxcui)
    if (f.drugName) query.drug = f.drugName
  }
  if (filterApplies(f.tab, 'reaction') && f.reaction?.trim()) query.reaction = f.reaction.trim()
  if (filterApplies(f.tab, 'quarter') && f.quarter) query.quarter = f.quarter
  if (f.minReports != null && f.minReports !== defaultMinReports(f.tab)) query.min = String(f.minReports)
  if (filterApplies(f.tab, 'pairs') && f.onlySignals === false) query.all = '1'
  if (f.page > 1) query.page = String(f.page)
  return query
}

// Why a list is empty, in words, so the empty state says what to change (FR-05). `filters` is the applied filter set.
//   "No signals in 2026Q3 with at least 20 reports. Try a lower minimum."
export function describeEmpty(filters, quarter = null) {
  const f = { ...defaultFilters(), ...filters }
  const min = effectiveMinReports(f)
  const where = quarter ? ` in ${quarter}` : ''
  const noun = f.tab === 'emerging' ? 'emerging signals' : 'signals'
  const narrowed = f.tab === 'all' && (f.rxcui || f.reaction)
  const tips = []
  if (min > MIN_REPORT_OPTIONS[0]) tips.push('a lower minimum')
  if (narrowed) tips.push('fewer filters')
  if (f.tab === 'all' && f.onlySignals) tips.push('"Show all pairs"')
  const tip = tips.length ? ` Try ${tips.join(' or ')}.` : ''
  const exact = f.tab === 'all' && f.reaction ? ' The reaction must match a term exactly (e.g. "NAUSEA"), not part of one.' : ''
  return `No ${noun}${where}${narrowed ? ' matching your filters' : ''} with at least ${min} ${min === 1 ? 'report' : 'reports'}.${tip}${exact}`
}
