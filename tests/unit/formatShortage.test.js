import { describe, expect, it } from 'vitest'
import { formatDate, formatShortage } from '@/domain/rules/formatShortage'
import { matchTypeLabel, signalProfileLabel, signalProfileTone } from '@/domain/rules/alternatives'

const shortage = (over = {}) => ({
  status: 'CURRENT', packagesInShortage: 3, packagesTotal: 12, dosageForms: [], since: '2026-09-12', reasons: [], ...over,
})

describe('formatDate', () => {
  it('prints day, short month and year', () => {
    expect(formatDate('2026-09-12')).toBe('12 Sep 2026')
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026')
    expect(formatDate('2026-12-31T23:59:00Z')).toBe('31 Dec 2026')
  })

  it('gives an empty string when there is no readable date', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
    expect(formatDate('soon')).toBe('')
    expect(formatDate('2026-13-01')).toBe('')
  })
})

describe('formatShortage', () => {
  it('describes a current shortage', () => {
    expect(formatShortage(shortage())).toEqual({
      tone: 'amber', title: 'Currently in shortage', subtitle: 'Since 12 Sep 2026 · 3 of 12 packages affected',
    })
  })

  it('describes a drug that will be discontinued the same way, in amber', () => {
    expect(formatShortage(shortage({ status: 'TO_BE_DISCONTINUED' }))).toEqual({
      tone: 'amber', title: 'To be discontinued', subtitle: 'Since 12 Sep 2026 · 3 of 12 packages affected',
    })
  })

  it('describes a resolved shortage in green, without a package count', () => {
    expect(formatShortage(shortage({ status: 'RESOLVED' }))).toEqual({
      tone: 'green', title: 'Resolved', subtitle: 'Listed since 12 Sep 2026',
    })
  })

  it('says no shortage was reported when there is no record (status null)', () => {
    expect(formatShortage(shortage({ status: null, packagesTotal: 0, packagesInShortage: 0, since: null }))).toEqual({
      tone: 'green', title: 'No shortage reported', subtitle: '',
    })
  })

  it('copes with a missing shortage block', () => {
    expect(formatShortage(undefined)).toEqual({ tone: 'green', title: 'No shortage reported', subtitle: '' })
    expect(formatShortage(null).title).toBe('No shortage reported')
  })

  it('uses the singular for one package', () => {
    expect(formatShortage(shortage({ packagesInShortage: 1, packagesTotal: 1 })).subtitle).toBe('Since 12 Sep 2026 · 1 of 1 package affected')
  })

  it('leaves out the parts it does not know', () => {
    expect(formatShortage(shortage({ since: null })).subtitle).toBe('3 of 12 packages affected')
    expect(formatShortage(shortage({ packagesTotal: 0 })).subtitle).toBe('Since 12 Sep 2026')
    expect(formatShortage(shortage({ since: null, packagesTotal: 0 })).subtitle).toBe('')
  })
})

describe('alternatives rules', () => {
  it('labels the match type', () => {
    expect(matchTypeLabel('SAME_INGREDIENT')).toBe('Same ingredient')
    expect(matchTypeLabel('SAME_CLASS')).toBe('Same class')
    expect(matchTypeLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(matchTypeLabel(undefined)).toBe('')
  })

  it('colours the signal profile: LOW green, MODERATE amber, HIGH coral', () => {
    expect(signalProfileTone('LOW')).toBe('green')
    expect(signalProfileTone('MODERATE')).toBe('amber')
    expect(signalProfileTone('HIGH')).toBe('coral')
    expect(signalProfileTone('???')).toBe('slate')
    expect(signalProfileTone(undefined)).toBe('slate')
  })

  it('labels the signal profile', () => {
    expect(['LOW', 'MODERATE', 'HIGH'].map(signalProfileLabel)).toEqual(['Low', 'Moderate', 'High'])
    expect(signalProfileLabel('???')).toBe('???')
  })
})
