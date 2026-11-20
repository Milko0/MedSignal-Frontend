import { describe, expect, it } from 'vitest'
import { toFollowedDrug } from '@/infrastructure/mappers/cabinetMapper'
import { followedDrug, followedDrugNoShortage } from '../../helpers/fixtures'

describe('cabinetMapper', () => {
  it('maps a followed drug in shortage', () => {
    expect(toFollowedDrug(followedDrug)).toEqual({
      rxcui: '5640', name: 'ibuprofen', shortageStatus: 'CURRENT', packagesInShortage: 3,
    })
  })

  it('keeps a null shortage status as null', () => {
    expect(toFollowedDrug(followedDrugNoShortage)).toEqual({
      rxcui: '161', name: 'acetaminophen', shortageStatus: null, packagesInShortage: 0,
    })
  })
})
