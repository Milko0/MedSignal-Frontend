import { describe, expect, it } from 'vitest'
import { toUser } from '@/infrastructure/mappers/userMapper'
import { userResponse } from '../../helpers/fixtures'

describe('userMapper', () => {
  it('maps user_id to id', () => {
    expect(toUser(userResponse)).toEqual({ id: 'u-1f3a', username: 'p1_test_a', email: 'p1_test_a@example.com', role: 'user' })
  })
})
