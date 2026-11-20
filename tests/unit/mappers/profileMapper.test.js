import { describe, expect, it } from 'vitest'
import { fromAlertSettings, toAlertSettings } from '@/infrastructure/mappers/profileMapper'
import { alertSettingsDto } from '../../helpers/fixtures'

describe('profileMapper', () => {
  it('maps alert settings to camelCase', () => {
    expect(toAlertSettings(alertSettingsDto)).toEqual({
      newSignal: true, labelUpdated: false, shortageChanged: true, newRecall: true, minReports: 25,
    })
  })

  it('maps the model back to the request body', () => {
    expect(fromAlertSettings(toAlertSettings(alertSettingsDto))).toEqual(alertSettingsDto)
  })

  it('falls back to the backend defaults for missing fields', () => {
    expect(toAlertSettings({})).toEqual({
      newSignal: true, labelUpdated: true, shortageChanged: true, newRecall: true, minReports: 20,
    })
  })
})
