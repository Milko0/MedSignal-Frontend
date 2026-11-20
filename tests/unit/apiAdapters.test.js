import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as fx from '../helpers/fixtures'

// The adapters are tested against a stubbed Axios instance: right URL, right params/body, model (not DTO) returned.
vi.mock('@/infrastructure/http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const { httpClient } = await import('@/infrastructure/http/httpClient')
const { authApi } = await import('@/infrastructure/api/authApi')
const { drugsApi } = await import('@/infrastructure/api/drugsApi')
const { shortagesApi } = await import('@/infrastructure/api/shortagesApi')
const { signalsApi } = await import('@/infrastructure/api/signalsApi')
const { statisticsApi } = await import('@/infrastructure/api/statisticsApi')
const { cabinetApi } = await import('@/infrastructure/api/cabinetApi')
const { profileApi } = await import('@/infrastructure/api/profileApi')

const reply = (data) => Promise.resolve({ data })
const noContent = () => Promise.resolve({ data: '' })

beforeEach(() => vi.resetAllMocks())

describe('authApi', () => {
  it('registers and returns a User model', async () => {
    httpClient.post.mockReturnValue(reply(fx.userResponse))
    const user = await authApi.register({ username: 'p1_test_a', email: 'p1_test_a@example.com', password: 'secret123' })
    expect(httpClient.post).toHaveBeenCalledWith('/auth/register', {
      username: 'p1_test_a', email: 'p1_test_a@example.com', password: 'secret123',
    })
    expect(user.id).toBe('u-1f3a')
  })

  it('logs in with identifier and returns only the access token', async () => {
    httpClient.post.mockReturnValue(reply(fx.tokenResponse))
    expect(await authApi.login({ identifier: 'p1_test_a', password: 'secret123' })).toEqual({ accessToken: 'jwt.token.value' })
    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', { identifier: 'p1_test_a', password: 'secret123' })
  })

  it('logs out through POST /auth/logout', async () => {
    httpClient.post.mockReturnValue(noContent())
    expect(await authApi.logout()).toBeUndefined()
    expect(httpClient.post).toHaveBeenCalledWith('/auth/logout')
  })
})

describe('drugsApi', () => {
  it('searches with query and limit and maps the results', async () => {
    httpClient.get.mockReturnValue(reply([fx.drugSearchResult]))
    const res = await drugsApi.search('ibuprofn', 5)
    expect(httpClient.get).toHaveBeenCalledWith('/drugs', { params: { query: 'ibuprofn', limit: 5 } })
    expect(res[0].brandNames).toEqual(['Advil', 'Motrin'])
  })

  it('omits the limit when it is not given', async () => {
    httpClient.get.mockReturnValue(reply([]))
    await drugsApi.search('ibu')
    expect(httpClient.get).toHaveBeenCalledWith('/drugs', { params: { query: 'ibu' } })
  })

  it('asks for the overview with snake_case filters and returns a Drug360', async () => {
    httpClient.get.mockReturnValue(reply(fx.drug360))
    const drug = await drugsApi.overview('5640', { dosageForm: 'TABLET', route: 'ORAL' })
    expect(httpClient.get).toHaveBeenCalledWith('/drugs/5640/overview', { params: { dosage_form: 'TABLET', route: 'ORAL' } })
    expect(drug.shortage.status).toBe('CURRENT')
  })

  it('sends no filter params when none are chosen', async () => {
    httpClient.get.mockReturnValue(reply(fx.drug360))
    await drugsApi.overview('5640')
    expect(httpClient.get).toHaveBeenCalledWith('/drugs/5640/overview', { params: {} })
  })

  it('maps the reaction trend', async () => {
    httpClient.get.mockReturnValue(reply([fx.trendPoint]))
    expect(await drugsApi.reactionTrend('5640', 12)).toEqual([{ month: '2026-03', reaction: 'Nausea', reports: 87 }])
    expect(httpClient.get).toHaveBeenCalledWith('/drugs/5640/reaction-trend', { params: { months: 12 } })
  })

  it('unwraps label gaps and keeps the disclaimer', async () => {
    httpClient.get.mockReturnValue(reply(fx.labelGapsEnvelope))
    const res = await drugsApi.labelGaps('5640', 30)
    expect(httpClient.get).toHaveBeenCalledWith('/drugs/5640/label-gaps', { params: { min_reports: 30 } })
    expect(res.gaps[0].matchLevel).toBe('NONE')
    expect(res.disclaimer).toBe(fx.DISCLAIMER_TEXT)
  })
})

describe('shortagesApi', () => {
  it('asks for alternatives with the chosen form and route', async () => {
    httpClient.get.mockReturnValue(reply(fx.alternativesData))
    const res = await shortagesApi.alternatives('5640', { dosageForm: 'TABLET' })
    expect(httpClient.get).toHaveBeenCalledWith('/shortages/5640/alternatives', { params: { dosage_form: 'TABLET' } })
    expect(res.items[0].signalProfile).toBe('LOW')
  })
})

describe('signalsApi', () => {
  it('lists signals with snake_case params, keeps onlySignals=false and returns a model with the disclaimer', async () => {
    httpClient.get.mockReturnValue(reply(fx.signalEnvelope))
    const res = await signalsApi.list({ rxcui: '5640', minReports: 20, onlySignals: false, page: 2, pageSize: 10, quarter: null })
    expect(httpClient.get).toHaveBeenCalledWith('/signals', {
      params: { rxcui: '5640', min_reports: 20, only_signals: false, page: 2, page_size: 10 },
    })
    expect(res.items[0].isSignal).toBe(true)
    expect(res.quarter).toBe('2026Q3')
    expect(res.disclaimer).toBe(fx.DISCLAIMER_TEXT)
  })

  it('lists emerging signals', async () => {
    httpClient.get.mockReturnValue(reply(fx.signalEnvelope))
    await signalsApi.emerging({ quarter: '2026Q3', minReports: 3 })
    expect(httpClient.get).toHaveBeenCalledWith('/signals/emerging', { params: { quarter: '2026Q3', min_reports: 3 } })
  })

  it('encodes the reaction in the path and maps the reports page', async () => {
    httpClient.get.mockReturnValue(reply(fx.signalReports))
    const res = await signalsApi.reports('5640', 'Nausea/vomiting', { page: 1, pageSize: 10 })
    expect(httpClient.get).toHaveBeenCalledWith('/signals/5640/Nausea%2Fvomiting/reports', { params: { page: 1, page_size: 10 } })
    expect(res.items[0].id).toBe('10234567')
    expect(res.totalPages).toBe(1)
  })
})

describe('statisticsApi', () => {
  it('sends group_by and maps the buckets', async () => {
    httpClient.get.mockReturnValue(reply(fx.statistics))
    const res = await statisticsApi.get({ groupBy: 'age_group', quarter: '2026Q3' })
    expect(httpClient.get).toHaveBeenCalledWith('/statistics', { params: { group_by: 'age_group', quarter: '2026Q3' } })
    expect(res.buckets[0]).toEqual({ group: '45-64', value: 30000 })
  })
})

describe('cabinetApi', () => {
  it('maps the followed list and the alerts', async () => {
    httpClient.get.mockReturnValueOnce(reply([fx.followedDrug, fx.followedDrugNoShortage]))
    httpClient.get.mockReturnValueOnce(reply([fx.alertItem]))
    const followed = await cabinetApi.list()
    expect(followed[1].shortageStatus).toBeNull()
    expect((await cabinetApi.alerts())[0].id).toBe('a-77')
  })

  it('follows, unfollows and dismisses (204 answers)', async () => {
    httpClient.post.mockReturnValue(noContent())
    httpClient.delete.mockReturnValue(noContent())
    expect(await cabinetApi.follow('5640')).toBeUndefined()
    expect(httpClient.post).toHaveBeenCalledWith('/cabinet/follows', { rxcui: '5640' })
    await cabinetApi.unfollow('5640')
    expect(httpClient.delete).toHaveBeenCalledWith('/cabinet/follows/5640')
    await cabinetApi.dismiss('a-77')
    expect(httpClient.delete).toHaveBeenCalledWith('/cabinet/alerts/a-77')
    await cabinetApi.dismissAll()
    expect(httpClient.delete).toHaveBeenCalledWith('/cabinet/alerts')
  })
})

describe('profileApi', () => {
  it('gets and updates the profile as a User model', async () => {
    httpClient.get.mockReturnValue(reply(fx.userResponse))
    httpClient.patch.mockReturnValue(reply({ ...fx.userResponse, username: 'new_name' }))
    expect((await profileApi.get()).id).toBe('u-1f3a')
    expect((await profileApi.update({ username: 'new_name' })).username).toBe('new_name')
  })

  it('changes the password with snake_case body fields', async () => {
    httpClient.post.mockReturnValue(noContent())
    await profileApi.changePassword({ currentPassword: 'old-pass-1', newPassword: 'new-pass-2' })
    expect(httpClient.post).toHaveBeenCalledWith('/profile/password', {
      current_password: 'old-pass-1', new_password: 'new-pass-2',
    })
  })

  it('reads and saves alert settings as camelCase models', async () => {
    httpClient.get.mockReturnValue(reply(fx.alertSettingsDto))
    httpClient.put.mockReturnValue(reply({ ...fx.alertSettingsDto, min_reports: 40 }))
    expect((await profileApi.getAlertSettings()).labelUpdated).toBe(false)
    const saved = await profileApi.saveAlertSettings({
      newSignal: true, labelUpdated: false, shortageChanged: true, newRecall: true, minReports: 40,
    })
    expect(httpClient.put).toHaveBeenCalledWith('/profile/alert-settings', { ...fx.alertSettingsDto, min_reports: 40 })
    expect(saved.minReports).toBe(40)
  })

  it('deletes the account', async () => {
    httpClient.delete.mockReturnValue(noContent())
    expect(await profileApi.remove()).toBeUndefined()
    expect(httpClient.delete).toHaveBeenCalledWith('/profile')
  })
})
