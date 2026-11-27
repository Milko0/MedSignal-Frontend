import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useUiStore } = await import('@/application/stores/useUiStore')
const AdminTermsView = (await import('@/presentation/views/AdminTermsView.vue')).default

let pinia
const wrappers = []
const show = async () => {
  const w = mount(AdminTermsView, { attachTo: document.body, global: { plugins: [pinia] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const apiError = (status, message) => Object.assign(new Error(message), { status, fieldErrors: {} })
const dialog = () => document.body.querySelector('[role="dialog"]')
const click = async (el) => { el.click(); await flushPromises() }
const footerButton = (label) => [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes(label))

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.admin.terms.list.mockResolvedValue(['death', 'drug ineffective'])
})
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('AdminTermsView', () => {
  it('lists the excluded terms', async () => {
    const w = await show()
    const items = w.findAll('.terms li').map((li) => li.find('span').text())
    expect(items).toEqual(['death', 'drug ineffective'])
  })

  it('says so when nothing is excluded', async () => {
    services.admin.terms.list.mockResolvedValue([])
    const w = await show()
    expect(w.text()).toContain('No terms are excluded')
  })

  it('shows a load error with Retry', async () => {
    services.admin.terms.list.mockRejectedValueOnce(apiError(500, 'Server error'))
    const w = await show()
    expect(w.find('[role="alert"]').text()).toContain('Server error')
    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.findAll('.terms li')).toHaveLength(2)
  })

  it('adds a term, toasts what the server stored and clears the box', async () => {
    services.admin.terms.add.mockResolvedValue('headache')
    const w = await show()
    const button = w.find('form .btn')
    expect(button.element.disabled).toBe(true)                      // nothing typed yet
    await w.find('form input').setValue('  Headache ')
    expect(button.element.disabled).toBe(false)
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(services.admin.terms.add).toHaveBeenCalledWith('Headache')
    expect(useUiStore().toast.message).toBe('"headache" is now excluded.')
    expect(w.find('form input').element.value).toBe('')
    expect(services.admin.terms.list).toHaveBeenCalledTimes(2)
  })

  it('shows a refused add under the box and keeps the text', async () => {
    services.admin.terms.add.mockRejectedValue(apiError(403, 'Insufficient permissions'))
    const w = await show()
    await w.find('form input').setValue('headache')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('form [role="alert"]').text()).toBe('Insufficient permissions')
    expect(w.find('form input').element.value).toBe('headache')
  })

  it('removes a term after a confirmation', async () => {
    services.admin.terms.remove.mockResolvedValue(undefined)
    await show()
    await click(document.body.querySelector('button[aria-label="Remove drug ineffective"]'))
    expect(dialog().textContent).toContain('drug ineffective')
    await click(footerButton('Remove term'))
    expect(services.admin.terms.remove).toHaveBeenCalledWith('drug ineffective')
    expect(dialog()).toBeNull()
    expect(useUiStore().toast.message).toBe('"drug ineffective" is no longer excluded.')
  })

  it('cancel leaves the term alone', async () => {
    await show()
    await click(document.body.querySelector('button[aria-label="Remove death"]'))
    await click(footerButton('Cancel'))
    expect(services.admin.terms.remove).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('keeps the dialog open and says why when the removal fails', async () => {
    services.admin.terms.remove.mockRejectedValue(apiError(404, 'Term not found'))
    await show()
    await click(document.body.querySelector('button[aria-label="Remove death"]'))
    await click(footerButton('Remove term'))
    expect(dialog().querySelector('[role="alert"]').textContent).toBe('Term not found')
  })
})
