import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DrugHeader from '@/presentation/components/drug/DrugHeader.vue'
import { toDrug360 } from '@/infrastructure/mappers/drugMapper'
import { drug360, drug360NoShortage } from '../helpers/fixtures'

const RouterLink = { props: ['to'], template: '<a class="link" :data-to="JSON.stringify(to)"><slot /></a>' }
const show = (props = {}, drug = toDrug360(drug360)) =>
  mount(DrugHeader, { props: { drug, loggedIn: true, ...props }, global: { stubs: { RouterLink } } })

describe('DrugHeader', () => {
  it('shows the name, the shortage chip and the identifiers', () => {
    const w = show()

    expect(w.find('h1').text()).toBe('ibuprofen')
    expect(w.find('.chip').text()).toBe('Currently in shortage')
    expect(w.find('.chip').classes()).toContain('amber')
    expect(w.find('.meta').text()).toContain('RxCUI 5640')
    expect(w.find('.meta').text()).toContain('ATC M01AE')
    expect(w.find('.meta').text()).toContain('Advil, Motrin')
  })

  it('shows a green "No shortage reported" chip when there is no record', () => {
    const w = show({}, toDrug360(drug360NoShortage))

    expect(w.find('.chip').text()).toBe('No shortage reported')
    expect(w.find('.chip').classes()).toContain('green')
  })

  it('shows only the first 3 brand names and ATC classes and counts the rest', () => {
    const drug = toDrug360({
      ...drug360,
      brand_names: ['A', 'B', 'C', 'D', 'E'],
      atc_classes: ['M01AE', 'N02AJ', 'C01EB', 'G02CC', 'R02AX'].map((id) => ({ class_id: id, name: `name ${id}` })),
    })
    const meta = show({}, drug).find('.meta').text()

    expect(meta).toContain('A, B, C +2 more')
    expect(meta).not.toContain('D, ')
    expect(meta).toContain('M01AE, N02AJ, C01EB +2')
    expect(meta).not.toContain('G02CC')
  })

  it('names the ATC class in the tooltip', () => {
    const w = show()

    expect(w.find('.meta span[title]').attributes('title')).toBe('Propionic acid derivatives')
  })

  it('leaves out the brands and ATC classes it does not have', () => {
    const w = show({}, toDrug360(drug360NoShortage))

    expect(w.find('.meta').text()).toBe('RxCUI 161')
  })

  it('shows the label description when there is one, and nothing when there is none', () => {
    expect(show().find('.about').text()).toBe('Nonsteroidal anti-inflammatory drug.')
    expect(show({}, toDrug360(drug360NoShortage)).find('.about').exists()).toBe(false)
  })

  describe('as a guest', () => {
    it('shows a login link that comes back to this drug, and no Follow button', () => {
      const w = show({ loggedIn: false })

      expect(w.find('button').exists()).toBe(false)
      expect(w.find('a.login').text()).toBe('Log in to follow')
      expect(JSON.parse(w.find('a.login').attributes('data-to'))).toEqual({ name: 'login', query: { redirect: '/drugs/5640' } })
    })
  })

  describe('as a user', () => {
    it('offers Follow for a drug that is not followed', () => {
      const w = show({}, toDrug360({ ...drug360, is_followed: false }))

      expect(w.find('button').text()).toBe('Follow')
      expect(w.find('button').attributes('aria-pressed')).toBe('false')
      expect(w.find('a.login').exists()).toBe(false)
    })

    it('shows Following (outlined) for a followed drug', () => {
      const w = show()

      expect(w.find('button').text()).toBe('Following')
      expect(w.find('button').attributes('aria-pressed')).toBe('true')
      expect(w.find('button').classes()).toContain('outline')
    })

    it('asks to toggle when the button is clicked', async () => {
      const w = show()

      await w.find('button').trigger('click')

      expect(w.emitted('toggle-follow')).toHaveLength(1)
    })

    it('disables the button while the request runs', async () => {
      const w = show({ followPending: true })

      expect(w.find('button').attributes('disabled')).toBeDefined()
      await w.find('button').trigger('click')
      expect(w.emitted('toggle-follow')).toBeUndefined()
    })

    it('says when following failed', () => {
      expect(show({ followError: new Error('boom') }).find('[role="alert"]').text()).toBe('Could not update. Try again.')
      expect(show().find('[role="alert"]').exists()).toBe(false)
    })
  })
})
