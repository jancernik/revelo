import { describe, it, expect, beforeEach } from '@jest/globals'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createTestApi } from '../testApi.js'
import { createImages, createImage, createUser } from '../testHelpers.js'
import { v4 as uuid } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = createTestApi()

const mockImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
)

describe('Image Endpoints', () => {
  let authenticatedUser
  let authToken

  beforeEach(async () => {
    authenticatedUser = await createUser({ emailVerified: true })
    const loginResponse = await request(app).post('/login').send({
      username: authenticatedUser.username,
      password: authenticatedUser.plainPassword
    })
    authToken = loginResponse.body.data.accessToken
  })

  describe('GET /images', () => {
    it('should get images successfully', async () => {
      await createImages(3)

      const response = await request(app).get('/images').expect(200)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })

    it('should get images with limit', async () => {
      await createImages(5)

      const response = await request(app).get('/images?limit=2').expect(200)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(2)
    })

    it('should get images with offset', async () => {
      await createImages(5)

      const response = await request(app).get('/images?offset=2').expect(200)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(3)
    })
  })

  describe('GET /tiny-images', () => {
    it('should get tiny images successfully', async () => {
      await createImages(2)

      const response = await request(app).get('/tiny-images').expect(200)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
    })
  })

  describe('GET /images/:id', () => {
    it('should get image by id successfully', async () => {
      const image = await createImage()

      const response = await request(app).get(`/images/${image.id}`).expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data.image).toEqual({
        id: image.id,
        aperture: image.aperture,
        camera: image.camera,
        date: image.date.toISOString(),
        focalLength: image.focalLength,
        iso: image.iso,
        lens: image.lens,
        originalFilename: image.originalFilename,
        shutterSpeed: image.shutterSpeed,
        versions: []
      })
    })

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .get('/images/550e8400-e29b-41d4-a716-446655440000')
        .expect(404)

      expect(response.body.status).toBe('fail')
      expect(response.body.data).toBeNull()
    })

    it('should return 400 for invalid image id', async () => {
      const response = await request(app).get('/images/invalid').expect(400)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('POST /upload/review', () => {
    it('should upload single image for review', async () => {
      const response = await request(app)
        .post('/upload/review')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', mockImageBuffer, 'test.png')
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty('sessionId')
      expect(response.body.data.images[0]).toHaveProperty('metadata')
      expect(response.body.data.images[0]).toHaveProperty('filePath')
    })

    it('should upload multiple images for review', async () => {
      const response = await request(app)
        .post('/upload/review')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', mockImageBuffer, 'test1.png')
        .attach('images', mockImageBuffer, 'test2.png')
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images).toHaveLength(2)
      expect(response.body.data.images[0]).toHaveProperty('sessionId')
      expect(response.body.data.images[1]).toHaveProperty('sessionId')
    })

    it('should return 400 for no files uploaded', async () => {
      const response = await request(app)
        .post('/upload/review')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.status).toBe('fail')
      expect(response.body.data).toBeNull()
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/upload/review')
        .attach('image', mockImageBuffer, 'test.png')
        .expect(401)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('POST /upload/confirm', () => {
    let sessionId

    beforeEach(async () => {
      const uploadResponse = await request(app)
        .post('/upload/review')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', mockImageBuffer, 'test.png')
      sessionId = uploadResponse.body.data.images[0].sessionId
    })

    it('should confirm single image upload with sessionId and metadata', async () => {
      const metadata = {
        camera: 'Canon EOS R5',
        lens: '24-70mm f/2.8',
        aperture: 'f/4',
        shutterSpeed: '1/60',
        iso: '400',
        focalLength: '50mm'
      }

      const response = await request(app)
        .post('/upload/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ images: [{ sessionId, metadata }] })
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty('id')
      expect(response.body.data.images[0].camera).toBe(metadata.camera)
      expect(response.body.data.images[0].lens).toBe(metadata.lens)
    })

    it('should confirm single image upload with image object', async () => {
      const imageData = {
        sessionId,
        metadata: {
          camera: 'Sony A7R V',
          iso: '200'
        }
      }

      const response = await request(app)
        .post('/upload/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ images: [imageData] })
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images.length).toBe(1)
      expect(response.body.data.images[0]).toHaveProperty('id')
      expect(response.body.data.images[0].camera).toBe(imageData.metadata.camera)
    })

    it('should confirm multiple images upload with images array', async () => {
      const uploadResponse2 = await request(app)
        .post('/upload/review')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('images', mockImageBuffer, 'test2.png')
      const sessionId2 = uploadResponse2.body.data.images[0].sessionId

      const imagesData = [
        {
          sessionId,
          metadata: { camera: 'Canon EOS R5' }
        },
        {
          sessionId: sessionId2,
          metadata: { camera: 'Sony A7R V' }
        }
      ]

      const response = await request(app)
        .post('/upload/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ images: imagesData })
        .expect(201)

      expect(response.body.status).toBe('success')
      expect(Array.isArray(response.body.data.images)).toBe(true)
      expect(response.body.data.images).toHaveLength(2)
      expect(response.body.data.images[0].camera).toBe('Canon EOS R5')
      expect(response.body.data.images[1].camera).toBe('Sony A7R V')
    })

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/upload/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe('fail')
    })

    it('should return 404 for expired session', async () => {
      const fakeSessionId = uuid()

      const response = await request(app)
        .post('/upload/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          images: [
            {
              sessionId: fakeSessionId,
              metadata: {}
            }
          ]
        })
        .expect(404)

      expect(response.body.status).toBe('fail')
      expect(response.body.data).toBeNull()
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post('/upload/confirm')
        .send({
          images: [{ sessionId, metadata: {} }]
        })
        .expect(401)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('PUT /images/:id/metadata', () => {
    let image

    beforeEach(async () => {
      image = await createImage()
    })

    it('should update image metadata successfully', async () => {
      const newMetadata = {
        camera: 'Updated Camera',
        lens: 'Updated Lens',
        aperture: 'f/1.4',
        iso: '800'
      }

      const response = await request(app)
        .put(`/images/${image.id}/metadata`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newMetadata)
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data.image.camera).toBe(newMetadata.camera)
      expect(response.body.data.image.lens).toBe(newMetadata.lens)
      expect(response.body.data.image.aperture).toBe(newMetadata.aperture)
      expect(response.body.data.image.iso).toBe(parseInt(newMetadata.iso, 10))
    })

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .put('/images/550e8400-e29b-41d4-a716-446655440000/metadata')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ camera: 'Test Camera' })
        .expect(404)

      expect(response.body.status).toBe('fail')
      expect(response.body.data).toBeNull()
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .put(`/images/${image.id}/metadata`)
        .send({ camera: 'Test Camera' })
        .expect(401)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('DELETE /images/:id', () => {
    let image

    beforeEach(async () => {
      image = await createImage()
    })

    it('should delete image successfully', async () => {
      const response = await request(app)
        .delete(`/images/${image.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data).toBeNull()

      const fetchResponse = await request(app).get(`/images/${image.id}`).expect(404)
      expect(fetchResponse.body.status).toBe('fail')
    })

    it('should return 404 for non-existent image', async () => {
      const response = await request(app)
        .delete('/images/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.status).toBe('fail')
      expect(response.body.data).toBeNull()
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).delete(`/images/${image.id}`).expect(401)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('POST /maintenance/cleanup-temp', () => {
    it('should cleanup temp files successfully', async () => {
      const response = await request(app)
        .post('/maintenance/cleanup-temp')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data.result).toHaveProperty('deleted')
      expect(response.body.data.result).toHaveProperty('scanned')
      expect(response.body.data.result).toHaveProperty('errors')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).post('/maintenance/cleanup-temp').expect(401)

      expect(response.body.status).toBe('fail')
    })
  })

  describe('POST /maintenance/cleanup-orphaned', () => {
    it('should cleanup orphaned files successfully', async () => {
      const response = await request(app)
        .post('/maintenance/cleanup-orphaned')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.status).toBe('success')
      expect(response.body.data.result).toHaveProperty('deleted')
      expect(response.body.data.result).toHaveProperty('scanned')
      expect(response.body.data.result).toHaveProperty('errors')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).post('/maintenance/cleanup-orphaned').expect(401)

      expect(response.body.status).toBe('fail')
    })
  })
})
