import { describe, it, expect } from '@jest/globals'
import request from 'supertest'
import { createTestApi } from '../testApi.js'
import { createImages } from '../testHelpers.js'

const app = createTestApi()

describe('Image Endpoints', () => {
  describe('GET /images', () => {
    it('should get images successfully', async () => {
      await createImages()

      const response = await request(app).get('/images').expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })
  })
})
