import { describe, expect, it } from 'vitest'
import { labelMatchLabel, signalSeverity } from '@/domain/rules/signalSeverity'
import { isEmerging } from '@/domain/rules/isEmerging'
import { isInShortage, shortageLabel, shortageTone } from '@/domain/rules/shortageStatus'
import { alertLabel, alertTone } from '@/domain/rules/alertTone'
import { STATUS } from '@/core/constants/status'
import { DISCLAIMER } from '@/core/constants/disclaimer'
import { DISCLAIMER_TEXT } from '../helpers/fixtures'

describe('domain rules', () => {
  it('maps PRR to severity', () => {
    expect(signalSeverity(3.4)).toBe('high')
    expect(signalSeverity(2.1)).toBe('medium')
    expect(signalSeverity(1.2)).toBe('low')
  })
  it('detects emerging signals', () => {
    expect(isEmerging(3.4, [2.0, 2.1, 2.2])).toBe(true)
    expect(isEmerging(2.2, [2.0, 2.1, 2.2])).toBe(false)
  })
})

describe('shortage status', () => {
  it('is in shortage for CURRENT and TO_BE_DISCONTINUED only', () => {
    expect(isInShortage('CURRENT')).toBe(true)
    expect(isInShortage('TO_BE_DISCONTINUED')).toBe(true)
    expect(isInShortage('RESOLVED')).toBe(false)
    expect(isInShortage(null)).toBe(false)
    expect(isInShortage(undefined)).toBe(false)
  })
  it('no longer recognises the old title-case values', () => {
    expect(isInShortage('Current')).toBe(false)
    expect(isInShortage('None')).toBe(false)
  })
  it('gives amber for shortage and green otherwise', () => {
    expect(shortageTone('CURRENT')).toBe('amber')
    expect(shortageTone('TO_BE_DISCONTINUED')).toBe('amber')
    expect(shortageTone('RESOLVED')).toBe('green')
    expect(shortageTone(null)).toBe('green')
  })
  it('labels every status', () => {
    expect(shortageLabel('CURRENT')).toBe('Currently in shortage')
    expect(shortageLabel('TO_BE_DISCONTINUED')).toBe('To be discontinued')
    expect(shortageLabel('RESOLVED')).toBe('Resolved')
    expect(shortageLabel(null)).toBe('No shortage reported')
  })
})

describe('alert tone', () => {
  it('maps each alert type to its palette tone', () => {
    expect(alertTone('SIGNAL')).toBe('coral')
    expect(alertTone('SHORTAGE')).toBe('amber')
    expect(alertTone('LABEL')).toBe('teal')
    expect(alertTone('RECALL')).toBe('slate')
  })
  it('labels each alert type and survives an unknown one', () => {
    expect(alertLabel('SIGNAL')).toBe('New signal')
    expect(alertLabel('SHORTAGE')).toBe('Shortage')
    expect(alertLabel('LABEL')).toBe('Label updated')
    expect(alertLabel('RECALL')).toBe('New recall')
    expect(alertTone('WHATEVER')).toBe('slate')
    expect(alertLabel('WHATEVER')).toBe('WHATEVER')
  })
})

describe('label match', () => {
  it('labels FULL / PARTIAL / NONE', () => {
    expect(labelMatchLabel('FULL')).toBe('Listed')
    expect(labelMatchLabel('PARTIAL')).toBe('Partly listed')
    expect(labelMatchLabel('NONE')).toBe('Not listed')
    expect(labelMatchLabel(undefined)).toBe('Unknown')
  })
})

describe('constants', () => {
  it('uses the exact backend disclaimer text', () => {
    expect(DISCLAIMER).toBe(DISCLAIMER_TEXT)
  })
  it('lets a status chip take the raw backend enums, in sync with the rules', () => {
    for (const s of ['CURRENT', 'TO_BE_DISCONTINUED', 'RESOLVED']) {
      expect(STATUS[s]).toEqual({ label: shortageLabel(s), tone: shortageTone(s) })
    }
    for (const t of ['SIGNAL', 'SHORTAGE', 'LABEL', 'RECALL']) {
      expect(STATUS[t]).toEqual({ label: alertLabel(t), tone: alertTone(t) })
    }
  })
})
