import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertList from '@/presentation/components/cabinet/AlertList.vue'

const ago = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString()
const alert = (id, over = {}) => ({ id, type: 'SHORTAGE', rxcui: '5640', drugName: 'ibuprofen', message: 'Ibuprofen tablets are now in shortage.', createdAt: ago(2), ...over })
const show = (alerts) => mount(AlertList, { props: { alerts } })

describe('AlertList', () => {
  it('lists the alerts with drug, type, message and relative time', () => {
    const w = show([alert('a-1'), alert('a-2', { type: 'SIGNAL', drugName: 'warfarin', message: 'New signal.', createdAt: ago(30) })])
    const items = w.findAll('li')

    expect(items).toHaveLength(2)
    expect(items[0].find('.title').text()).toBe('ibuprofen: Shortage')
    expect(items[0].find('.msg').text()).toBe('Ibuprofen tablets are now in shortage.')
    expect(items[0].find('time').text()).toBe('2 h ago')
    expect(items[1].find('.title').text()).toBe('warfarin: New signal')
    expect(items[1].find('time').text()).toBe('yesterday')
  })

  it('colours the dot by type', () => {
    const w = show([alert('a', { type: 'SHORTAGE' }), alert('b', { type: 'SIGNAL' }), alert('c', { type: 'LABEL' }), alert('d', { type: 'RECALL' })])

    expect(w.findAll('.dot').map((d) => d.classes().find((c) => ['amber', 'coral', 'teal', 'slate'].includes(c)))).toEqual(['amber', 'coral', 'teal', 'slate'])
  })

  it('shows how many alerts there are', () => {
    expect(show([alert('a'), alert('b')]).find('h2 .count').text()).toBe('2')
  })

  it('says there are no alerts in the last 30 days when the list is empty, and offers no Dismiss all', () => {
    const w = show([])

    expect(w.text()).toContain('No alerts in the last 30 days.')
    expect(w.find('ul').exists()).toBe(false)
    expect(w.text()).not.toContain('Dismiss all')
    expect(w.find('h2').text()).toBe('Alerts')
  })

  it('always tells that alerts are removed after 30 days', () => {
    expect(show([alert('a')]).find('.note').text()).toBe('Alerts are removed automatically after 30 days.')
    expect(show([]).find('.note').text()).toBe('Alerts are removed automatically after 30 days.')
  })

  describe('dismiss one', () => {
    it('emits the id of the alert whose × was clicked', async () => {
      const w = show([alert('a-1'), alert('a-2')])

      await w.findAll('.x')[1].trigger('click')

      expect(w.emitted('dismiss')).toEqual([['a-2']])
    })

    it('names the drug on the button for screen readers', () => {
      expect(show([alert('a-1')]).find('.x').attributes('aria-label')).toBe('Dismiss alert for ibuprofen')
    })
  })

  describe('dismiss all', () => {
    it('asks for confirmation first and emits nothing yet', async () => {
      const w = show([alert('a'), alert('b'), alert('c')])

      await w.findAll('.head button').find((b) => b.text() === 'Dismiss all').trigger('click')

      expect(w.emitted('dismiss-all')).toBeUndefined()
      expect(w.find('.confirm').text()).toContain('Dismiss all 3?')
    })

    it('emits dismiss-all when confirmed and closes the question', async () => {
      const w = show([alert('a'), alert('b')])
      await w.findAll('.head button').find((b) => b.text() === 'Dismiss all').trigger('click')

      await w.findAll('.confirm button').find((b) => b.text() === 'Yes, dismiss').trigger('click')

      expect(w.emitted('dismiss-all')).toHaveLength(1)
      expect(w.find('.confirm').exists()).toBe(false)
    })

    it('Cancel closes the question without emitting', async () => {
      const w = show([alert('a')])
      await w.findAll('.head button').find((b) => b.text() === 'Dismiss all').trigger('click')

      await w.findAll('.confirm button').find((b) => b.text() === 'Cancel').trigger('click')

      expect(w.emitted('dismiss-all')).toBeUndefined()
      expect(w.findAll('.head button').some((b) => b.text() === 'Dismiss all')).toBe(true)
    })
  })
})
