import { beforeEach, describe, expect, it, vi } from 'vitest'
import { userResponse } from '../helpers/fixtures'

// Like apiAdapters.test.js: a stubbed Axios instance, so the test checks URL, params/body and what comes back.
vi.mock('@/infrastructure/http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const { httpClient } = await import('@/infrastructure/http/httpClient')
const { adminApi } = await import('@/infrastructure/api/adminApi')

const reply = (data) => Promise.resolve({ data })
const noContent = () => Promise.resolve({ data: '' })

beforeEach(() => vi.resetAllMocks())

describe('adminApi users', () => {
  it('lists a page and returns User models (user_id becomes id)', async () => {
    httpClient.get.mockReturnValue(reply([userResponse]))
    const users = await adminApi.users.list({ page: 2, pageSize: 20 })
    expect(httpClient.get).toHaveBeenCalledWith('/admin/users', { params: { page: 2, page_size: 20 } })
    expect(users).toEqual([{ id: 'u-1f3a', username: 'p1_test_a', email: 'p1_test_a@example.com', role: 'user' }])
  })

  it('asks for page 1 of 10 when nothing is given', async () => {
    httpClient.get.mockReturnValue(reply([]))
    await adminApi.users.list()
    expect(httpClient.get).toHaveBeenCalledWith('/admin/users', { params: { page: 1, page_size: 10 } })
  })

  it('creates, updates (PUT, only what is sent) and deletes by id', async () => {
    httpClient.post.mockReturnValue(reply(userResponse))
    httpClient.put.mockReturnValue(reply({ ...userResponse, role: 'admin' }))
    httpClient.delete.mockReturnValue(noContent())

    await adminApi.users.create({ username: 'luca', email: 'luca@example.com', password: 'password123', role: 'user' })
    expect(httpClient.post).toHaveBeenCalledWith('/admin/users', {
      username: 'luca', email: 'luca@example.com', password: 'password123', role: 'user',
    })

    const updated = await adminApi.users.update('u-1f3a', { role: 'admin' })
    expect(httpClient.put).toHaveBeenCalledWith('/admin/users/u-1f3a', { role: 'admin' })
    expect(updated.role).toBe('admin')

    expect(await adminApi.users.remove('u-1f3a')).toBeUndefined()
    expect(httpClient.delete).toHaveBeenCalledWith('/admin/users/u-1f3a')
  })
})

describe('adminApi documents (reports, labels, shortages)', () => {
  it('keeps the backend shape and encodes the id in the path', async () => {
    const doc = { report_id: '1234/5', quarter: '2026Q3' }
    httpClient.get.mockReturnValue(reply(doc))
    expect(await adminApi.reports.get('1234/5')).toEqual(doc)
    expect(httpClient.get).toHaveBeenCalledWith('/admin/reports/1234%2F5')
  })

  it('uses the right collection for each resource', async () => {
    httpClient.get.mockReturnValue(reply([]))
    await adminApi.labels.list({ page: 1, pageSize: 5 })
    await adminApi.shortages.list({ page: 3, pageSize: 5 })
    expect(httpClient.get).toHaveBeenNthCalledWith(1, '/admin/labels', { params: { page: 1, page_size: 5 } })
    expect(httpClient.get).toHaveBeenNthCalledWith(2, '/admin/shortages', { params: { page: 3, page_size: 5 } })
  })

  it('sends the whole document on create and update', async () => {
    const doc = { package_ndc: '0000-0000-00', status: 'CURRENT' }
    httpClient.post.mockReturnValue(reply(doc))
    httpClient.put.mockReturnValue(reply(doc))
    await adminApi.shortages.create(doc)
    await adminApi.shortages.update('0000-0000-00', doc)
    expect(httpClient.post).toHaveBeenCalledWith('/admin/shortages', doc)
    expect(httpClient.put).toHaveBeenCalledWith('/admin/shortages/0000-0000-00', doc)
  })
})

describe('adminApi terms', () => {
  it('lists plain strings, adds and returns the normalised term', async () => {
    httpClient.get.mockReturnValue(reply([{ term: 'death' }, { term: 'drug ineffective' }]))
    expect(await adminApi.terms.list()).toEqual(['death', 'drug ineffective'])
    httpClient.post.mockReturnValue(reply({ term: 'headache' }))
    expect(await adminApi.terms.add('Headache ')).toBe('headache')
    expect(httpClient.post).toHaveBeenCalledWith('/admin/excluded-terms', { term: 'Headache ' })
  })

  it('encodes the term when removing it (spaces, slashes)', async () => {
    httpClient.delete.mockReturnValue(noContent())
    await adminApi.terms.remove('pain / ache')
    expect(httpClient.delete).toHaveBeenCalledWith('/admin/excluded-terms/pain%20%2F%20ache')
  })
})

describe('adminApi ingestion', () => {
  it('maps FAERS files', async () => {
    httpClient.get.mockReturnValue(reply([{ name: 'a.zip', quarter: '2026Q3', size_mb: 12.5, modified_at: '2026-11-01T00:00:00Z', quarter_loaded: true }]))
    expect(await adminApi.ingestion.faersFiles()).toEqual([
      { name: 'a.zip', quarter: '2026Q3', sizeMb: 12.5, modifiedAt: '2026-11-01T00:00:00Z', quarterLoaded: true },
    ])
    expect(httpClient.get).toHaveBeenCalledWith('/admin/ingestion/faers-files')
  })

  it('previews a quarter with ?adding= and maps the window', async () => {
    httpClient.get.mockReturnValue(reply({ window_quarters: 6, quarters: ['2026Q1'], adding: '2026Q4', would_drop: ['2025Q1'] }))
    const q = await adminApi.ingestion.quarters('2026Q4')
    expect(httpClient.get).toHaveBeenCalledWith('/admin/ingestion/quarters', { params: { adding: '2026Q4' } })
    expect(q).toEqual({ windowQuarters: 6, quarters: ['2026Q1'], adding: '2026Q4', wouldDrop: ['2025Q1'] })
  })

  it('sends no adding param when there is none', async () => {
    httpClient.get.mockReturnValue(reply({ window_quarters: 6, quarters: [] }))
    await adminApi.ingestion.quarters()
    expect(httpClient.get).toHaveBeenCalledWith('/admin/ingestion/quarters', { params: {} })
  })

  it('starts a FAERS load, sending the window only when given', async () => {
    httpClient.post.mockReturnValue(reply({ job: 'faers', status: 'started', detail: 'Loading 1 file(s)' }))
    await adminApi.ingestion.startFaers({ files: ['a.zip'] })
    expect(httpClient.post).toHaveBeenLastCalledWith('/admin/ingestion/faers', { files: ['a.zip'] })
    const started = await adminApi.ingestion.startFaers({ files: ['a.zip'], windowQuarters: 4 })
    expect(httpClient.post).toHaveBeenLastCalledWith('/admin/ingestion/faers', { files: ['a.zip'], window_quarters: 4 })
    expect(started).toEqual({ job: 'faers', status: 'started', detail: 'Loading 1 file(s)' })
  })

  it('starts the incremental update with optional query params and no body', async () => {
    httpClient.post.mockReturnValue(reply({ job: 'incremental', status: 'started', detail: 'Polling' }))
    await adminApi.ingestion.startIncremental({ sinceDays: 7, labelLimit: 100 })
    expect(httpClient.post).toHaveBeenLastCalledWith('/admin/ingestion/incremental', null, {
      params: { label_limit: 100, since_days: 7 },
    })
    await adminApi.ingestion.startIncremental()
    expect(httpClient.post).toHaveBeenLastCalledWith('/admin/ingestion/incremental', null, { params: {} })
  })

  it('reads runs with skip/limit (not page/page_size) and maps them', async () => {
    httpClient.get.mockReturnValue(reply([{
      run_id: 'r1', type: 'INCREMENTAL', source: 'openfda', started_at: '2026-11-25T03:00:00Z', ended_at: null,
      records_loaded: 5, records_skipped: 1, errors: [], stats: { labels: 5 },
    }]))
    const runs = await adminApi.ingestion.runs({ skip: 20, limit: 20 })
    expect(httpClient.get).toHaveBeenCalledWith('/admin/ingestion/runs', { params: { skip: 20, limit: 20 } })
    expect(runs[0]).toMatchObject({ id: 'r1', endedAt: null, recordsLoaded: 5, recordsSkipped: 1, stats: { labels: 5 } })
  })

  it('keeps skip=0 in the query (zero is a real value)', async () => {
    httpClient.get.mockReturnValue(reply([]))
    await adminApi.ingestion.runs()
    expect(httpClient.get).toHaveBeenCalledWith('/admin/ingestion/runs', { params: { skip: 0, limit: 20 } })
  })
})

describe('adminApi reconcile', () => {
  it('posts with no body and returns the dict as it is', async () => {
    httpClient.post.mockReturnValue(reply({ shortage_status_rebuilt: 12 }))
    expect(await adminApi.reconcile()).toEqual({ shortage_status_rebuilt: 12 })
    expect(httpClient.post).toHaveBeenCalledWith('/admin/reconciliation')
  })
})
