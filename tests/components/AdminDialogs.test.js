import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ConfirmDialog from '@/presentation/components/admin/ConfirmDialog.vue'
import JsonRecordDialog from '@/presentation/components/admin/JsonRecordDialog.vue'
import PagerBar from '@/presentation/components/admin/PagerBar.vue'

const wrappers = []
const show = (component, props, options = {}) =>
  wrappers[wrappers.push(mount(component, { props, attachTo: document.body, ...options })) - 1]
beforeEach(() => { document.body.innerHTML = '' })
afterEach(() => { wrappers.splice(0).forEach((w) => w.unmount()) })

describe('ConfirmDialog', () => {
  const base = { open: true, title: 'Delete user', message: 'Delete luca?' }

  it('renders nothing while closed', () => {
    expect(show(ConfirmDialog, { ...base, open: false }).find('[role="dialog"]').exists()).toBe(false)
  })

  it('is a labelled modal dialog with the message', () => {
    const w = show(ConfirmDialog, base)
    const dialog = w.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(w.find(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Delete user')
    expect(w.text()).toContain('Delete luca?')
  })

  it('confirms and cancels', async () => {
    const w = show(ConfirmDialog, base)
    const [cancel, confirm] = w.findAll('footer button')
    await confirm.trigger('click')
    await cancel.trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
    expect(w.emitted('cancel')).toHaveLength(1)
  })

  it('closes on Escape and on the backdrop', async () => {
    const w = show(ConfirmDialog, base)
    await w.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await w.find('.backdrop').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(2)
  })

  it('cannot be closed or confirmed again while a request is pending', async () => {
    const w = show(ConfirmDialog, { ...base, pending: true })
    await w.find('.backdrop').trigger('click')
    await w.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    const buttons = w.findAll('button')
    expect(buttons.every((b) => b.element.disabled)).toBe(true)
    expect(w.emitted('cancel')).toBeUndefined()
    expect(w.text()).toContain('Working…')
  })

  it('shows the failure as an alert', () => {
    const w = show(ConfirmDialog, { ...base, failure: 'This is the last administrator' })
    expect(w.find('[role="alert"]').text()).toBe('This is the last administrator')
  })

  it('with requireText, confirm stays disabled until that text is typed exactly (spaces around it are ignored)', async () => {
    const w = show(ConfirmDialog, { ...base, requireText: 'luca' })
    const confirm = w.findAll('footer button')[1]
    expect(confirm.element.disabled).toBe(true)
    await w.find('input').setValue('Luca')
    expect(confirm.element.disabled).toBe(true)
    await w.find('input').setValue('  luca ')
    expect(confirm.element.disabled).toBe(false)
    await confirm.trigger('click')
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('Enter in the typed field confirms only when it matches', async () => {
    const w = show(ConfirmDialog, { ...base, requireText: 'luca' })
    await w.find('input').setValue('lu')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('confirm')).toBeUndefined()
    await w.find('input').setValue('luca')
    await w.find('input').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('confirm')).toHaveLength(1)
  })

  it('forgets what was typed when it is opened again', async () => {
    const w = show(ConfirmDialog, { ...base, requireText: 'luca' })
    await w.find('input').setValue('luca')
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(w.find('input').element.value).toBe('')
  })

  it('returns focus to the element that opened it', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const w = show(ConfirmDialog, { ...base, open: false })
    await w.setProps({ open: true })
    await nextTick()
    expect(document.activeElement).not.toBe(opener)
    await w.setProps({ open: false })
    expect(document.activeElement).toBe(opener)
  })
})

describe('JsonRecordDialog', () => {
  const base = { open: true, title: 'New report', text: '{\n  "report_id": ""\n}', idField: 'report_id' }

  it('starts with the given JSON', () => {
    expect(show(JsonRecordDialog, base).find('textarea').element.value).toBe(base.text)
  })

  it('saves the parsed object when the text is valid', async () => {
    const w = show(JsonRecordDialog, base)
    await w.find('textarea').setValue('{"report_id":"R1","quarter":"2026Q3"}')
    await w.findAll('footer button')[1].trigger('click')
    expect(w.emitted('save')[0][0]).toEqual({ report_id: 'R1', quarter: '2026Q3' })
    expect(w.find('[role="alert"]').exists()).toBe(false)
  })

  it('does not save, and says why, when the JSON is broken', async () => {
    const w = show(JsonRecordDialog, base)
    await w.find('textarea').setValue('{"report_id": ')
    await w.findAll('footer button')[1].trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.find('[role="alert"]').text()).toMatch(/not valid JSON/)
    expect(w.find('textarea').attributes('aria-invalid')).toBe('true')
  })

  it('does not save an empty id', async () => {
    const w = show(JsonRecordDialog, base)   // the template has report_id ""
    await w.findAll('footer button')[1].trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.find('[role="alert"]').text()).toMatch(/"report_id" is required/)
  })

  it('when editing, a changed id is refused', async () => {
    const w = show(JsonRecordDialog, { ...base, expectedId: 'R1' })
    await w.find('textarea').setValue('{"report_id":"R2"}')
    await w.findAll('footer button')[1].trigger('click')
    expect(w.emitted('save')).toBeUndefined()
    expect(w.find('[role="alert"]').text()).toMatch(/must stay "R1"/)
  })

  it('shows the server failure (422, 409) under the editor', () => {
    const w = show(JsonRecordDialog, { ...base, failure: 'Report R1 already exists' })
    expect(w.find('[role="alert"]').text()).toBe('Report R1 already exists')
  })

  it('reloads the starting text each time it opens, dropping old edits', async () => {
    const w = show(JsonRecordDialog, base)
    await w.find('textarea').setValue('{"changed":true}')
    await w.setProps({ open: false })
    await w.setProps({ open: true })
    expect(w.find('textarea').element.value).toBe(base.text)
  })

  it('is locked while saving', async () => {
    const w = show(JsonRecordDialog, { ...base, pending: true })
    expect(w.findAll('footer button').every((b) => b.element.disabled)).toBe(true)
    await w.find('.backdrop').trigger('click')
    expect(w.emitted('cancel')).toBeUndefined()
  })
})

describe('PagerBar', () => {
  it('shows the page and enables only the possible directions', () => {
    const w = show(PagerBar, { page: 2, hasPrev: true, hasNext: false })
    const [prev, next] = w.findAll('button')
    expect(w.text()).toContain('Page 2')
    expect(prev.element.disabled).toBe(false)
    expect(next.element.disabled).toBe(true)
  })

  it('emits prev and next, and is locked while loading', async () => {
    const w = show(PagerBar, { page: 2, hasPrev: true, hasNext: true })
    const [prev, next] = w.findAll('button')
    await prev.trigger('click')
    await next.trigger('click')
    expect(w.emitted('prev')).toHaveLength(1)
    expect(w.emitted('next')).toHaveLength(1)
    await w.setProps({ loading: true })
    expect(w.findAll('button').every((b) => b.element.disabled)).toBe(true)
  })
})
