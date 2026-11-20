import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FollowedDrugRow from '@/presentation/components/cabinet/FollowedDrugRow.vue'
import { buildRows } from '@/domain/rules/cabinet'

const RouterLink = { props: ['to'], template: '<a class="name" :data-to="JSON.stringify(to)"><slot /></a>' }
const drug = (over = {}) => ({ rxcui: '5640', name: 'ibuprofen', shortageStatus: null, packagesInShortage: 0, ...over })
const alert = (type, over = {}) => ({ id: 'a-1', type, rxcui: '5640', message: `${type} happened`, createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), ...over })
const rowOf = (d, alerts = []) => buildRows([d], alerts)[0]
const show = (row) => mount(FollowedDrugRow, { props: { row }, global: { stubs: { RouterLink } } })

describe('FollowedDrugRow', () => {
  it('links the name to the drug page', () => {
    const w = show(rowOf(drug()))

    expect(w.find('a.name').text()).toBe('ibuprofen')
    expect(JSON.parse(w.find('a.name').attributes('data-to'))).toEqual({ name: 'drug', params: { rxcui: '5640' } })
  })

  describe('status chip', () => {
    it.each([
      ['SHORTAGE', 'Shortage', 'amber'],
      ['SIGNAL', 'New signal', 'coral'],
      ['LABEL', 'Label updated', 'teal'],
      ['RECALL', 'New recall', 'slate'],
    ])('newest alert %s: "%s" in %s', (type, label, tone) => {
      const w = show(rowOf(drug(), [alert(type)]))

      expect(w.find('.chip').text()).toBe(label)
      expect(w.find('.chip').classes()).toContain(tone)
    })

    it('a drug in shortage without an alert is amber', () => {
      const w = show(rowOf(drug({ shortageStatus: 'CURRENT', packagesInShortage: 3 })))

      expect(w.find('.chip').text()).toBe('Currently in shortage')
      expect(w.find('.chip').classes()).toContain('amber')
    })

    it('a drug with nothing to report is green "No changes"', () => {
      const w = show(rowOf(drug()))

      expect(w.find('.chip').text()).toBe('No changes')
      expect(w.find('.chip').classes()).toContain('green')
    })
  })

  describe('subtitle and time', () => {
    it('shows the message and the relative time of the newest alert', () => {
      const w = show(rowOf(drug(), [alert('SIGNAL', { message: 'New signal for nausea.' })]))

      expect(w.find('.sub').text()).toBe('New signal for nausea.')
      expect(w.find('time').text()).toBe('2 h ago')
      expect(w.find('time').attributes('datetime')).toBeTruthy()
    })

    it('without an alert, shows the packages in shortage, or "No recent changes", and no time', () => {
      expect(show(rowOf(drug({ shortageStatus: 'CURRENT', packagesInShortage: 3 }))).find('.sub').text()).toBe('3 packages in shortage')
      expect(show(rowOf(drug({ shortageStatus: 'CURRENT', packagesInShortage: 1 }))).find('.sub').text()).toBe('1 package in shortage')
      expect(show(rowOf(drug({ shortageStatus: 'CURRENT', packagesInShortage: 0 }))).find('.sub').text()).toBe('In shortage')
      const quiet = show(rowOf(drug()))
      expect(quiet.find('.sub').text()).toBe('No recent changes')
      expect(quiet.find('time').exists()).toBe(false)
    })
  })

  describe('unfollow', () => {
    it('shows "Following" first and asks before it unfollows', async () => {
      const w = show(rowOf(drug()))
      expect(w.find('.actions button').text()).toBe('Following')

      await w.find('.actions button').trigger('click')

      expect(w.emitted('unfollow')).toBeUndefined()
      expect(w.find('.confirm').text()).toContain('Unfollow?')
    })

    it('emits the rxcui when confirmed, and goes back to "Following"', async () => {
      const w = show(rowOf(drug()))
      await w.find('.actions button').trigger('click')

      await w.findAll('.confirm button').find((b) => b.text() === 'Unfollow').trigger('click')

      expect(w.emitted('unfollow')).toEqual([['5640']])
      expect(w.find('.confirm').exists()).toBe(false)
    })

    it('Cancel and Escape leave without unfollowing', async () => {
      const w = show(rowOf(drug()))
      await w.find('.actions button').trigger('click')
      await w.findAll('.confirm button').find((b) => b.text() === 'Cancel').trigger('click')
      expect(w.find('.confirm').exists()).toBe(false)

      await w.find('.actions button').trigger('click')
      await w.find('li').trigger('keydown', { key: 'Escape' })

      expect(w.find('.confirm').exists()).toBe(false)
      expect(w.emitted('unfollow')).toBeUndefined()
    })

    it('names the drug for screen readers', () => {
      expect(show(rowOf(drug())).find('.actions button').attributes('aria-label')).toBe('Following ibuprofen. Unfollow')
    })
  })
})
