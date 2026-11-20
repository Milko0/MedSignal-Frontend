import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const { services } = await import('@/composition/container')
const DrugSearchBox = (await import('@/presentation/components/drug/DrugSearchBox.vue')).default

const ibuprofen = { rxcui: '5640', name: 'ibuprofen', brandNames: ['Advil', 'Motrin'], matched: 'ADVIL', score: 0.93 }
const ibandronate = { rxcui: '29', name: 'ibandronate', brandNames: [], matched: 'ibandronate', score: 0.6 }

let pinia
const show = (props = {}) => mount(DrugSearchBox, { attachTo: document.body, props, global: { plugins: [pinia] } })

// Type and wait out the 300 ms debounce.
async function type(w, text) {
  await w.find('input').setValue(text)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

beforeEach(() => {
  document.body.innerHTML = ''
  vi.useFakeTimers()
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
})
afterEach(() => vi.useRealTimers())

describe('DrugSearchBox', () => {
  it('waits for the debounce before searching, then lists the results', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show()

    await w.find('input').setValue('ibuprofn')
    expect(services.drug.search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(299)
    expect(services.drug.search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(services.drug.search).toHaveBeenCalledOnce()
    expect(services.drug.search).toHaveBeenCalledWith('ibuprofn', 10)
    const options = w.findAll('[role="option"]')
    expect(options.map((o) => o.find('.name').text())).toEqual(['ibuprofen', 'ibandronate'])
  })

  it('sends only the last text typed in a burst', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()

    await w.find('input').setValue('ib')
    await vi.advanceTimersByTimeAsync(200)
    await w.find('input').setValue('ibuprofn')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(services.drug.search).toHaveBeenCalledTimes(1)
    expect(services.drug.search).toHaveBeenCalledWith('ibuprofn', 10)
  })

  it('does not send a request for one character, and drops a pending one', async () => {
    const w = show()

    await w.find('input').setValue('a')
    await vi.advanceTimersByTimeAsync(500)
    expect(services.drug.search).not.toHaveBeenCalled()

    await w.find('input').setValue('ab')
    await w.find('input').setValue('a')
    await vi.advanceTimersByTimeAsync(500)
    expect(services.drug.search).not.toHaveBeenCalled()
    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it('shows brand names and "matched" only when a different name matched', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show()
    await type(w, 'advil')

    const [first, second] = w.findAll('[role="option"]')
    expect(first.find('.brands').text()).toBe('Advil, Motrin')
    expect(first.find('.matched').text()).toBe('matched: ADVIL')
    expect(second.find('.matched').exists()).toBe(false)
    expect(second.find('.brands').exists()).toBe(false)
  })

  it('moves the highlight with the arrow keys (wrapping) and opens the highlighted result on Enter', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show()
    await type(w, 'ibu')
    const input = w.find('input')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(w.findAll('[role="option"]')[0].classes()).toContain('active')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(w.findAll('[role="option"]')[1].classes()).toContain('active')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(w.findAll('[role="option"]')[0].classes()).toContain('active')
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(w.findAll('[role="option"]')[1].classes()).toContain('active')
    expect(input.attributes('aria-activedescendant')).toBe(w.findAll('[role="option"]')[1].attributes('id'))

    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '29' } })
  })

  it('opens the top result on Enter when nothing is highlighted', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show()
    await type(w, 'ibu')

    await w.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '5640' } })
  })

  it('searches immediately on Enter instead of waiting for the debounce', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()

    await w.find('input').setValue('ibuprofn')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(500)

    expect(services.drug.search).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '5640' } })
  })

  it('does nothing on Enter for a query that is too short', async () => {
    const w = show()
    await w.find('input').setValue('a')

    await w.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(services.drug.search).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('opens the top result from the Search button', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()
    await type(w, 'ibuprofn')

    await w.find('form').trigger('submit')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '5640' } })
  })

  it('opens a result on click and empties the box', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show()
    await type(w, 'ibu')

    await w.findAll('[role="option"]')[1].trigger('click')
    await vi.advanceTimersByTimeAsync(500)

    expect(push).toHaveBeenCalledWith({ name: 'drug', params: { rxcui: '29' } })
    expect(w.find('input').element.value).toBe('')
    expect(w.find('[role="listbox"]').exists()).toBe(false)
    expect(services.drug.search).toHaveBeenCalledTimes(1)
  })

  it('closes the list on Escape', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()
    await type(w, 'ibu')
    expect(w.find('[role="listbox"]').exists()).toBe(true)

    await w.find('input').trigger('keydown', { key: 'Escape' })

    expect(w.find('[role="listbox"]').exists()).toBe(false)
  })

  it("says so when nothing matches: No drug matches 'xyz'", async () => {
    services.drug.search.mockResolvedValue([])
    const w = show()
    await type(w, 'xyz')

    expect(w.find('[role="listbox"]').text()).toBe("No drug matches 'xyz'")
  })

  it('shows "Search is unavailable, try again" when the request fails', async () => {
    services.drug.search.mockRejectedValue(new Error('Network Error'))
    const w = show()
    await type(w, 'ibu')

    expect(w.find('[role="listbox"]').text()).toBe('Search is unavailable, try again')
    expect(w.find('[role="option"]').exists()).toBe(false)
  })

  it('offers example drugs that fill the box and search at once', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()
    const chips = w.findAll('.chip')
    expect(chips.map((c) => c.text())).toEqual(['amoxicillin', 'ibuprofen', 'metformin'])

    await chips[1].trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(500)

    expect(w.find('input').element.value).toBe('ibuprofen')
    expect(services.drug.search).toHaveBeenCalledTimes(1)
    expect(services.drug.search).toHaveBeenCalledWith('ibuprofen', 10)
    expect(w.findAll('[role="option"]')).toHaveLength(1)
  })

  it('the compact version has no Search button and no example chips', () => {
    const w = show({ compact: true })

    expect(w.find('button[type="submit"]').exists()).toBe(false)
    expect(w.find('.chip').exists()).toBe(false)
    expect(w.find('input').exists()).toBe(true)
  })

  it('shows the results only in the box the user typed in', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const a = show({ compact: true })
    const b = show()

    await type(a, 'ibu')

    expect(a.findAll('[role="option"]')).toHaveLength(1)
    expect(b.find('[role="listbox"]').exists()).toBe(false)
  })
})

describe('DrugSearchBox as a picker', () => {
  it('emits the chosen drug instead of navigating, and empties the box', async () => {
    services.drug.search.mockResolvedValue([ibuprofen, ibandronate])
    const w = show({ picker: true })
    await type(w, 'ibu')

    await w.findAll('[role="option"]')[1].trigger('click')

    expect(w.emitted('select')).toEqual([[{ rxcui: '29', name: 'ibandronate' }]])
    expect(push).not.toHaveBeenCalled()
    expect(w.find('input').element.value).toBe('')
  })

  it('emits the top result on Enter', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show({ picker: true })
    await type(w, 'ibuprofn')

    await w.find('input').trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(w.emitted('select')).toEqual([[{ rxcui: '5640', name: 'ibuprofen' }]])
    expect(push).not.toHaveBeenCalled()
  })

  it('has no Search button and no example chips', () => {
    const w = show({ picker: true })

    expect(w.find('button[type="submit"]').exists()).toBe(false)
    expect(w.find('.chip').exists()).toBe(false)
    expect(w.find('input').attributes('placeholder')).toBe('Search a drug')
  })

  it('does not emit select in the normal mode', async () => {
    services.drug.search.mockResolvedValue([ibuprofen])
    const w = show()
    await type(w, 'ibu')

    await w.findAll('[role="option"]')[0].trigger('click')

    expect(w.emitted('select')).toBeUndefined()
    expect(push).toHaveBeenCalledOnce()
  })
})
