const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/

const toIndex = (month) => {
  const m = MONTH.exec(month)
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null
}
const toMonth = (index) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`

// FR-03: the backend sends a flat list [{ month: 'YYYY-MM', reaction, reports }] for the most reported reactions.
// The chart wants one series per reaction on a shared month axis:
//   [{ reaction, months: ['2026-01', ...], counts: [n, ...] }]
// - the `top` reactions with the most reports in total are kept (default 3, the mock-up's "Top 3 reactions"),
//   ordered by that total, descending (ties: alphabetical);
// - the axis runs over every calendar month between the first and the last month of the kept series, so a month
//   with no row shows as 0 instead of the line jumping over it;
// - rows with an unreadable month are ignored; repeated (month, reaction) rows are added up.
export function pivotTrend(points, top = 3) {
  const totals = new Map()   // reaction -> Map(monthIndex -> reports)
  for (const p of points ?? []) {
    const index = toIndex(p?.month)
    if (index === null || !p.reaction) continue
    if (!totals.has(p.reaction)) totals.set(p.reaction, new Map())
    const byMonth = totals.get(p.reaction)
    byMonth.set(index, (byMonth.get(index) ?? 0) + (Number(p.reports) || 0))
  }

  const sum = (byMonth) => [...byMonth.values()].reduce((a, b) => a + b, 0)
  const kept = [...totals.entries()]
    .sort(([nameA, a], [nameB, b]) => sum(b) - sum(a) || nameA.localeCompare(nameB))
    .slice(0, top)
  if (!kept.length) return []

  const indexes = kept.flatMap(([, byMonth]) => [...byMonth.keys()])
  const first = Math.min(...indexes)
  const last = Math.max(...indexes)
  const months = Array.from({ length: last - first + 1 }, (_, i) => toMonth(first + i))

  return kept.map(([reaction, byMonth]) => ({
    reaction,
    months,
    counts: months.map((_, i) => byMonth.get(first + i) ?? 0),
  }))
}
