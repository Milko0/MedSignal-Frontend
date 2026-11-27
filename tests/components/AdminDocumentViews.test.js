import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/composition/container', async () => ({
  services: (await import('../helpers/mockServices')).mockServices(),
}))

const { services } = await import('@/composition/container')
const { useUiStore } = await import('@/application/stores/useUiStore')
const AdminReportsView = (await import('@/presentation/views/AdminReportsView.vue')).default
const AdminLabelsView = (await import('@/presentation/views/AdminLabelsView.vue')).default

const R1 = {
  report_id: 'R1', version: 1, receive_date: '2026-07-04', quarter: '2026Q3', seriousness: { serious: true },
  drugs: [{ raw_name: 'IBUPROFEN' }], reactions: [{ pt: 'HEADACHE' }, { pt: 'NAUSEA' }], country: 'US',
}
const R2 = { report_id: 'R2', receive_date: '2026-08-01', quarter: '2026Q3', seriousness: {}, drugs: [], reactions: [] }
const L1 = { set_id: 'L1', version: 2, product_type: 'RX', effective_date: '2026-02-01', has_boxed_warning: true, ingredient_rxcuis: ['5640'], sections: { adverse_reactions: 'Nausea.' } }

let pinia
const wrappers = []
const show = async (view) => {
  const w = mount(view, { attachTo: document.body, global: { plugins: [pinia] } })
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

beforeEach(() => {
  document.body.innerHTML = ''
  vi.resetAllMocks()
  pinia = createPinia()
  setActivePinia(pinia)
  services.admin.reports.list.mockResolvedValue([R1, R2])
  services.admin.labels.list.mockResolvedValue([L1])
})
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('AdminReportsView', () => {
  it('lists report summaries', async () => {
    await show(AdminReportsView)
    expect(services.admin.reports.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    const row = rowOf('R1').textContent
    expect(row).toContain('4 Jul 2026')
    expect(row).toContain('Serious')
    expect(row).toContain('US')
    expect(rowOf('R2').textContent).toContain('Unknown')
  })

  it('shows an error with Retry, and an empty page message', async () => {
    services.admin.reports.list.mockRejectedValueOnce(apiError(500, 'Server error'))
    const w = await show(AdminReportsView)
    expect(w.find('[role="alert"]').text()).toContain('Server error')
    services.admin.reports.list.mockResolvedValue([])
    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Nothing on this page')
  })

  it('shows the record as JSON from View', async () => {
    await show(AdminReportsView)
    await click(rowOf('R1').querySelector('button[aria-label="View R1"]'))
    expect(dialog().textContent).toContain('Report id: R1')
    expect(JSON.parse(dialog().querySelector('pre').textContent)).toEqual(R1)
  })

  describe('open by id', () => {
    it('opens a record that is not on the page', async () => {
      services.admin.reports.get.mockResolvedValue({ report_id: 'R99', quarter: '2025Q1' })
      const w = await show(AdminReportsView)
      await setValue(w.find('.lookup input').element, ' R99 ')
      await w.find('.lookup').trigger('submit')
      await flushPromises()
      expect(services.admin.reports.get).toHaveBeenCalledWith('R99')
      expect(dialog().textContent).toContain('R99')
    })

    it('says so when there is no such record, and the button is off for empty input', async () => {
      services.admin.reports.get.mockRejectedValue(apiError(404, 'Report nope not found'))
      const w = await show(AdminReportsView)
      expect(w.find('.lookup button').element.disabled).toBe(true)
      await setValue(w.find('.lookup input').element, 'nope')
      await w.find('.lookup').trigger('submit')
      await flushPromises()
      expect(w.find('.lookup [role="alert"]').text()).toBe('No report with id nope.')
      expect(dialog()).toBeNull()
    })
  })

  describe('create', () => {
    const openNew = async (w) => { await w.find('.admin-bar .btn').trigger('click'); await flushPromises() }

    it('starts from a template and refuses an empty id without calling the server', async () => {
      const w = await show(AdminReportsView)
      await openNew(w)
      const text = JSON.parse(dialog().querySelector('textarea').value)
      expect(text).toMatchObject({ report_id: '', report_type: 'SPONTANEOUS' })
      await click(footerButton('Create report'))
      expect(services.admin.reports.create).not.toHaveBeenCalled()
      expect(dialog().textContent).toContain('"report_id" is required')
    })

    it('creates the record typed in, reloads and toasts', async () => {
      services.admin.reports.create.mockResolvedValue({})
      const w = await show(AdminReportsView)
      await openNew(w)
      await setValue(dialog().querySelector('textarea'), JSON.stringify({ ...R1, report_id: 'NEW1' }))
      await click(footerButton('Create report'))
      expect(services.admin.reports.create).toHaveBeenCalledWith({ ...R1, report_id: 'NEW1' })
      expect(dialog()).toBeNull()
      expect(useUiStore().toast.message).toBe('The report was created.')
      expect(services.admin.reports.list).toHaveBeenCalledTimes(2)
    })

    it('shows a duplicate id (409) and the fields of a 422 in the dialog', async () => {
      services.admin.reports.create.mockRejectedValueOnce(apiError(409, 'Report R1 already exists'))
      services.admin.reports.create.mockRejectedValueOnce(apiError(422, 'Field required', { receive_date: 'Field required' }))
      const w = await show(AdminReportsView)
      await openNew(w)
      await setValue(dialog().querySelector('textarea'), JSON.stringify({ report_id: 'R1' }))
      await click(footerButton('Create report'))
      expect(dialog().querySelector('[role="alert"]').textContent).toBe('Report R1 already exists')
      await click(footerButton('Create report'))
      expect(dialog().querySelector('[role="alert"]').textContent).toContain('receive_date — Field required')
    })
  })

  describe('edit', () => {
    it('reads the record again, locks the id, and saves with PUT semantics', async () => {
      services.admin.reports.get.mockResolvedValue({ ...R1, country: 'IT' })
      services.admin.reports.update.mockResolvedValue({})
      await show(AdminReportsView)
      await click(rowOf('R1').querySelector('button[aria-label="Edit R1"]'))
      expect(services.admin.reports.get).toHaveBeenCalledWith('R1')
      const area = dialog().querySelector('textarea')
      expect(JSON.parse(area.value).country).toBe('IT')            // the fresh copy, not the list row

      await setValue(area, JSON.stringify({ ...R1, report_id: 'OTHER' }))
      await click(footerButton('Save changes'))
      expect(services.admin.reports.update).not.toHaveBeenCalled()
      expect(dialog().textContent).toContain('must stay "R1"')

      await setValue(area, JSON.stringify({ ...R1, country: 'FR' }))
      await click(footerButton('Save changes'))
      expect(services.admin.reports.update).toHaveBeenCalledWith('R1', { ...R1, country: 'FR' })
      expect(useUiStore().toast.message).toBe('The report was saved.')
    })

    it('says the record is gone when it was deleted meanwhile, and refreshes the list', async () => {
      services.admin.reports.get.mockRejectedValue(apiError(404, 'Report R1 not found'))
      await show(AdminReportsView)
      await click(rowOf('R1').querySelector('button[aria-label="Edit R1"]'))
      expect(dialog()).toBeNull()
      expect(useUiStore().toast.message).toBe('This report no longer exists.')
      expect(services.admin.reports.list).toHaveBeenCalledTimes(2)
    })

    it('can be started from the detail dialog', async () => {
      services.admin.reports.get.mockResolvedValue(R1)
      await show(AdminReportsView)
      await click(rowOf('R1').querySelector('button[aria-label="View R1"]'))
      await click(footerButton('Edit'))
      expect(dialog().textContent).toContain('Edit report')
    })
  })

  describe('delete', () => {
    it('confirms, deletes and reloads', async () => {
      services.admin.reports.remove.mockResolvedValue(undefined)
      await show(AdminReportsView)
      await click(rowOf('R2').querySelector('button[aria-label="Delete R2"]'))
      expect(dialog().textContent).toContain('Delete the report R2?')
      await click(footerButton('Delete report'))
      expect(services.admin.reports.remove).toHaveBeenCalledWith('R2')
      expect(dialog()).toBeNull()
      expect(useUiStore().toast.message).toBe('The report R2 was deleted.')
    })

    it('keeps the dialog open when the server refuses', async () => {
      services.admin.reports.remove.mockRejectedValue(apiError(404, 'Report R2 not found'))
      await show(AdminReportsView)
      await click(rowOf('R2').querySelector('button[aria-label="Delete R2"]'))
      await click(footerButton('Delete report'))
      expect(dialog().querySelector('[role="alert"]').textContent).toContain('not found')
    })

    it('can be started from the detail dialog', async () => {
      await show(AdminReportsView)
      await click(rowOf('R1').querySelector('button[aria-label="View R1"]'))
      await click(footerButton('Delete'))
      expect(dialog().textContent).toContain('Delete the report R1?')
    })
  })
})

describe('AdminLabelsView', () => {
  it('lists label summaries with their own columns', async () => {
    await show(AdminLabelsView)
    const row = rowOf('L1').textContent
    expect(row).toContain('RX')
    expect(row).toContain('Yes')
    expect(row).toContain('1 Feb 2026')
    expect(document.body.textContent).toContain('Label set id')
  })

  it('creates with set_id as the id field and its own template', async () => {
    services.admin.labels.create.mockResolvedValue({})
    const w = await show(AdminLabelsView)
    await w.find('.admin-bar .btn').trigger('click')
    await flushPromises()
    expect(JSON.parse(dialog().querySelector('textarea').value)).toMatchObject({ set_id: '', product_type: 'RX' })
    await setValue(dialog().querySelector('textarea'), JSON.stringify({ set_id: 'NEW-L' }))
    await click(footerButton('Create label'))
    expect(services.admin.labels.create).toHaveBeenCalledWith({ set_id: 'NEW-L' })
  })

  it('deletes by set id', async () => {
    services.admin.labels.remove.mockResolvedValue(undefined)
    await show(AdminLabelsView)
    await click(rowOf('L1').querySelector('button[aria-label="Delete L1"]'))
    await click(footerButton('Delete label'))
    expect(services.admin.labels.remove).toHaveBeenCalledWith('L1')
  })
})
