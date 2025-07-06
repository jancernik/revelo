import { describe, it, expect } from '@jest/globals'
import { createUser } from '../testHelpers.js'
import User from '../../api/models/User.js'

describe('User Model', () => {
  it('should find user by email', async () => {
    const testUser = await createUser({
      email: 'findme@example.com',
      username: 'findme'
    })

    const user = await User.findByEmail('findme@example.com')

    expect(user).toBeDefined()
    expect(user.id).toBe(testUser.id)
    expect(user.email).toBe('findme@example.com')
    expect(user.username).toBe('findme')
  })
})
