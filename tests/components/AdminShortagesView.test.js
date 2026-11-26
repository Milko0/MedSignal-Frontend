import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useUiStore } = await import('@/application/stores/useUiStore')
const AdminShortagesView = (await import('@/presentation/views/AdminShortagesView.vue')).default

const A = {
  package_ndc: '0001-0001-01', generic_name: 'Lisdexamfetamine', dosage_form: 'CAPSULE', status: 'CURRENT', availability: 'LIMITED',
  ingredient_rxcuis: ['700810'], routes: ['ORAL'], update_date: '2026-10-01', first_seen: '2026-09-12T03:00:00Z',
}
const B = { package_ndc: '0002-0002-02', generic_name: null, dosage_form: null, status: 'RESOLVED', availability: 'AVAILABLE' }

let pinia
const wrappers = []
const show = async () => {
  const w = mount(AdminShortagesView, { attachTo: document.body, global: { plugins: [pinia] } })
  wrappers.push(w)
  await flushPromises()
  return w
}
const apiError = (status, message, fieldErrors = {}) => Object.assign(new Error(message), { status, fieldErrors })
const dialog = () => document.body.querySelector('[role="dialog"]')
const click = async (el) => { el.click(); await flushPromises() }
const setValue = async (el, value) => { el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }
const rowOf = (text) => [...document.body.querySelectorAll('tbody tr')].find((r) => r.textContent.includes(text))
const footerButton = (label) => [...dialog().querySelectorAll('footer button')].find((b) => b.textContent.includes(label))
const input = (label) => dialog().querySelector(`input[id$="-${label}"]`)

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.admin.shortages.list.mockResolvedValue([A, B])
})
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('AdminShortagesView', () => {
  it('lists records with status chip, dashes for missing text and a readable date', async () => {
    await show()
    expect(services.admin.shortages.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(rowOf('0001-0001-01').textContent).toContain('Lisdexamfetamine')
    expect(rowOf('0001-0001-01').textContent).toContain('Currently in shortage')
    expect(rowOf('0001-0001-01').textContent).toContain('1 Oct 2026')
    expect(rowOf('0002-0002-02').textContent).toContain('—')
    expect(rowOf('0002-0002-02').textContent).toContain('Resolved')
  })

  it('shows an error with Retry', async () => {
    services.admin.shortages.list.mockRejectedValueOnce(apiError(500, 'Server error'))
    const w = await show()
    expect(w.find('[role="alert"]').text()).toContain('Server error')
    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(rowOf('0001-0001-01')).toBeTruthy()
  })

  it('creates a record from the form (lists split, blanks become null)', async () => {
    services.admin.shortages.create.mockResolvedValue({})
    const w = await show()
    await w.find('.admin-bar .btn').trigger('click')
    await flushPromises()
    expect(dialog().textContent).toContain('New shortage record')

    await click(footerButton('Create record'))
    expect(services.admin.shortages.create).not.toHaveBeenCalled()
    expect(dialog().textContent).toContain('Enter the package NDC')

    await setValue(input('package_ndc'), '9999-0000-01')
    await setValue(input('generic_name'), 'Amoxicillin')
    await setValue(input('ingredient_rxcuis'), '723, 724')
    await click(footerButton('Create record'))

    const body = services.admin.shortages.create.mock.calls[0][0]
    expect(body).toMatchObject({
      package_ndc: '9999-0000-01', generic_name: 'Amoxicillin', ingredient_rxcuis: ['723', '724'],
      status: 'CURRENT', availability: 'UNKNOWN', company: null, routes: [],
    })
    expect(dialog()).toBeNull()
    expect(useUiStore().toast.message).toBe('Shortage record created.')
  })

  it('shows "already exists" under the NDC and keeps the dialog open', async () => {
    services.admin.shortages.create.mockRejectedValue(apiError(409, 'Shortage 9999 already exists'))
    const w = await show()
    await w.find('.admin-bar .btn').trigger('click')
    await flushPromises()
    await setValue(input('package_ndc'), '9999')
    await click(footerButton('Create record'))
    expect(dialog().textContent).toContain('already exists')
    expect(input('package_ndc').getAttribute('aria-invalid')).toBe('true')
  })

  it('edits a record: NDC is locked, Save is off until something changes, the whole record is sent', async () => {
    services.admin.shortages.update.mockResolvedValue({})
    await show()
    await click(rowOf('0001-0001-01').querySelector('button[aria-label="Edit 0001-0001-01"]'))
    expect(input('package_ndc').disabled).toBe(true)
    expect(footerButton('Save changes').disabled).toBe(true)

    const status = dialog().querySelector('select[id$="-status"]')
    status.value = 'RESOLVED'
    status.dispatchEvent(new Event('change'))
    await flushPromises()
    await click(footerButton('Save changes'))

    const [id, body] = services.admin.shortages.update.mock.calls[0]
    expect(id).toBe('0001-0001-01')
    expect(body).toMatchObject({ status: 'RESOLVED', first_seen: A.first_seen, ingredient_rxcuis: ['700810'] })
    expect(useUiStore().toast.message).toBe('Shortage record updated.')
  })

  it('rejects a bad date without calling the server', async () => {
    await show()
    await click(rowOf('0001-0001-01').querySelector('button[aria-label="Edit 0001-0001-01"]'))
    const date = input('update_date')
    await setValue(date, '2026-10-02')           // changes the record so Save is enabled
    expect(footerButton('Save changes').disabled).toBe(false)
    await setValue(input('ingredient_rxcuis'), 'abc')
    await click(footerButton('Save changes'))
    expect(services.admin.shortages.update).not.toHaveBeenCalled()
    expect(dialog().textContent).toContain('RxCUIs are numbers')
  })

  it('deletes after a confirmation', async () => {
    services.admin.shortages.remove.mockResolvedValue(undefined)
    await show()
    await click(rowOf('0002-0002-02').querySelector('button[aria-label="Delete 0002-0002-02"]'))
    expect(dialog().textContent).toContain('0002-0002-02')
    await click(footerButton('Delete record'))
    expect(services.admin.shortages.remove).toHaveBeenCalledWith('0002-0002-02')
    expect(dialog()).toBeNull()
    expect(useUiStore().toast.message).toContain('deleted')
  })

  it('keeps the dialog open when the delete is refused', async () => {
    services.admin.shortages.remove.mockRejectedValue(apiError(404, 'Shortage not found'))
    await show()
    await click(rowOf('0002-0002-02').querySelector('button[aria-label="Delete 0002-0002-02"]'))
    await click(footerButton('Delete record'))
    expect(dialog().querySelector('[role="alert"]').textContent).toContain('not found')
  })
})
