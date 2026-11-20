import { describe, expect, it } from 'vitest'
import { toAlert } from '@/infrastructure/mappers/alertMapper'
import { alertItem } from '../../helpers/fixtures'

describe('alertMapper', () => {
  it('maps alert_id / drug_rxcui / created_at', () => {
    expect(toAlert(alertItem)).toEqual({
      id: 'a-77', type: 'SHORTAGE', rxcui: '5640', message: 'Ibuprofen tablets are now in shortage.',
      createdAt: '2026-11-18T09:30:00Z',
    })
  })
})
