import { describe, expect, it } from 'vitest'
import { alertsByRxcui, buildRows, FILTERS, latestAlertByRxcui, matchesFilter, rowStatus, sortAlerts } from '@/domain/rules/cabinet'

const alert = (id, type, rxcui, createdAt, message = `${type} ${id}`) => ({ id, type, rxcui, message, createdAt })
const drug = (rxcui, name, shortageStatus = null, packagesInShortage = 0) => ({ rxcui, name, shortageStatus, packagesInShortage })

describe('sortAlerts', () => {
  it('puts the newest first and does not change the list it was given', () => {
    const list = [alert('a', 'SIGNAL', '1', '2026-11-10T10:00:00Z'), alert('b', 'SIGNAL', '1', '2026-11-12T10:00:00Z'), alert('c', 'SIGNAL', '1', '2026-11-11T10:00:00Z')]

    expect(sortAlerts(list).map((a) => a.id)).toEqual(['b', 'c', 'a'])
    expect(list.map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('puts alerts with an unreadable date last, and copes with no list', () => {
    const list = [alert('x', 'SIGNAL', '1', 'soon'), alert('a', 'SIGNAL', '1', '2026-11-10T10:00:00Z'), alert('y', 'SIGNAL', '1', undefined)]

    expect(sortAlerts(list)[0].id).toBe('a')
    expect(sortAlerts(undefined)).toEqual([])
  })
})

describe('latestAlertByRxcui', () => {
  it('keeps the newest alert of each drug', () => {
    const latest = latestAlertByRxcui([
      alert('old', 'SIGNAL', '5640', '2026-11-01T00:00:00Z'),
      alert('new', 'SHORTAGE', '5640', '2026-11-18T00:00:00Z'),
      alert('other', 'RECALL', '161', '2026-11-05T00:00:00Z'),
    ])

    expect(latest.get('5640').id).toBe('new')
    expect(latest.get('161').id).toBe('other')
    expect(latest.has('999')).toBe(false)
  })

  it('is empty without alerts', () => {
    expect(latestAlertByRxcui([]).size).toBe(0)
    expect(latestAlertByRxcui(undefined).size).toBe(0)
  })
})

describe('alertsByRxcui', () => {
  it('groups by drug, newest first inside each group', () => {
    const groups = alertsByRxcui([
      alert('a', 'SIGNAL', '1', '2026-11-01T00:00:00Z'),
      alert('b', 'LABEL', '2', '2026-11-02T00:00:00Z'),
      alert('c', 'SIGNAL', '1', '2026-11-03T00:00:00Z'),
    ])

    expect(groups.get('1').map((x) => x.id)).toEqual(['c', 'a'])
    expect(groups.get('2').map((x) => x.id)).toEqual(['b'])
  })
})

describe('rowStatus', () => {
  it.each([
    ['SHORTAGE', 'Shortage', 'amber'],
    ['SIGNAL', 'New signal', 'coral'],
    ['LABEL', 'Label updated', 'teal'],
    ['RECALL', 'New recall', 'slate'],
  ])('shows the newest alert first: %s reads "%s" in %s', (type, label, tone) => {
    expect(rowStatus(drug('1', 'a'), alert('x', type, '1', '2026-11-01T00:00:00Z'))).toEqual({ kind: type, label, tone })
  })

  it('an alert wins over the shortage status', () => {
    const s = rowStatus(drug('1', 'a', 'CURRENT'), alert('x', 'SIGNAL', '1', '2026-11-01T00:00:00Z'))

    expect(s).toMatchObject({ kind: 'SIGNAL', tone: 'coral' })
  })

  it('without an alert, a drug in shortage is amber', () => {
    expect(rowStatus(drug('1', 'a', 'CURRENT'), null)).toEqual({ kind: 'SHORTAGE', label: 'Currently in shortage', tone: 'amber' })
    expect(rowStatus(drug('1', 'a', 'TO_BE_DISCONTINUED'), null)).toEqual({ kind: 'SHORTAGE', label: 'To be discontinued', tone: 'amber' })
  })

  it('a resolved shortage is green "Resolved"; nothing at all is green "No changes"', () => {
    expect(rowStatus(drug('1', 'a', 'RESOLVED'), null)).toEqual({ kind: 'NONE', label: 'Resolved', tone: 'green' })
    expect(rowStatus(drug('1', 'a', null), null)).toEqual({ kind: 'NONE', label: 'No changes', tone: 'green' })
  })

  it('an unknown alert type is shown under its own name in a neutral colour', () => {
    expect(rowStatus(drug('1', 'a'), alert('x', 'MYSTERY', '1', '2026-11-01T00:00:00Z'))).toEqual({ kind: 'MYSTERY', label: 'MYSTERY', tone: 'slate' })
  })
})

describe('buildRows', () => {
  const followed = [drug('1', 'zeta'), drug('2', 'alpha', 'CURRENT', 3), drug('3', 'mid'), drug('4', 'beta')]
  const alerts = [alert('a', 'SIGNAL', '3', '2026-11-10T00:00:00Z'), alert('b', 'RECALL', '4', '2026-11-12T00:00:00Z'), alert('c', 'LABEL', '3', '2026-11-01T00:00:00Z')]

  it('orders drugs with alerts first (newest alert first), then drugs in shortage, then by name', () => {
    expect(buildRows(followed, alerts).map((r) => r.name)).toEqual(['beta', 'mid', 'alpha', 'zeta'])
  })

  it('gives every row its newest alert, all its alerts and its status', () => {
    const mid = buildRows(followed, alerts).find((r) => r.rxcui === '3')

    expect(mid.alert.id).toBe('a')
    expect(mid.alerts.map((x) => x.id)).toEqual(['a', 'c'])
    expect(mid.status.kind).toBe('SIGNAL')
  })

  it('keeps the drug fields and gives rows without alerts an empty list', () => {
    const alpha = buildRows(followed, alerts).find((r) => r.rxcui === '2')

    expect(alpha).toMatchObject({ name: 'alpha', shortageStatus: 'CURRENT', packagesInShortage: 3, alert: null, alerts: [] })
    expect(alpha.status.label).toBe('Currently in shortage')
  })

  it('ignores alerts of drugs that are not followed (any more)', () => {
    const rows = buildRows([drug('1', 'a')], [alert('z', 'SIGNAL', '999', '2026-11-10T00:00:00Z')])

    expect(rows).toHaveLength(1)
    expect(rows[0].alert).toBeNull()
  })

  it('is empty without followed drugs', () => {
    expect(buildRows([], alerts)).toEqual([])
    expect(buildRows(undefined, undefined)).toEqual([])
  })
})

describe('matchesFilter', () => {
  const rows = buildRows(
    [drug('1', 'with-signal'), drug('2', 'in-shortage', 'CURRENT'), drug('3', 'quiet'), drug('4', 'old-signal-new-recall')],
    [
      alert('a', 'SIGNAL', '1', '2026-11-10T00:00:00Z'),
      alert('b', 'SIGNAL', '4', '2026-11-01T00:00:00Z'),
      alert('c', 'RECALL', '4', '2026-11-05T00:00:00Z'),
    ],
  )
  const names = (filter) => rows.filter((r) => matchesFilter(r, filter)).map((r) => r.name).sort()

  it('ALL keeps every row', () => {
    expect(names('ALL')).toHaveLength(4)
  })

  it('SIGNAL: drugs with a signal alert, even when a newer alert of another type hides it in the row', () => {
    expect(names('SIGNAL')).toEqual(['old-signal-new-recall', 'with-signal'])
  })

  it('SHORTAGE: a shortage alert or a drug currently in shortage without one', () => {
    expect(names('SHORTAGE')).toEqual(['in-shortage'])
    const withAlert = buildRows([drug('9', 'x')], [alert('s', 'SHORTAGE', '9', '2026-11-10T00:00:00Z')])
    expect(matchesFilter(withAlert[0], 'SHORTAGE')).toBe(true)
  })

  it('RECALL and LABEL', () => {
    expect(names('RECALL')).toEqual(['old-signal-new-recall'])
    expect(names('LABEL')).toEqual([])
  })

  it('a resolved shortage is not under SHORTAGE', () => {
    const [row] = buildRows([drug('1', 'a', 'RESOLVED')], [])

    expect(matchesFilter(row, 'SHORTAGE')).toBe(false)
  })
})

describe('FILTERS', () => {
  it('lists the chips in the order of the mock-up', () => {
    expect(FILTERS.map((f) => f.label)).toEqual(['All', 'Shortage', 'Signals', 'Label', 'Recalls'])
    expect(FILTERS.map((f) => f.key)).toEqual(['ALL', 'SHORTAGE', 'SIGNAL', 'LABEL', 'RECALL'])
  })
})
