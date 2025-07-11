import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createImage, createImages } from '../testHelpers.js'
import Image from '../../api/models/Image.js'
import { ImagesTable, ImageVersionsTable } from '../../api/drizzle/schema.js'
import { eq } from 'drizzle-orm'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_IMAGE_DATA = {
  originalFilename: 'test-image.jpg',
  camera: 'Test Camera',
  lens: 'Test Lens',
  aperture: 'f/2.8',
  shutterSpeed: '1/125',
  iso: 200,
  focalLength: '50mm',
  date: new Date('2023-01-01')
}

const createMockFile = (filename = 'test.jpg') => {
  const mockImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    'base64'
  )

  const tempDir = path.join(__dirname, '../../temp')
  const tempFilePath = path.join(tempDir, filename)

  return {
    originalname: filename,
    path: tempFilePath,
    size: mockImageBuffer.length,
    mimetype: 'image/png',
    buffer: mockImageBuffer
  }
}

const createTempFile = async (file) => {
  const tempDir = path.dirname(file.path)
  await fs.mkdir(tempDir, { recursive: true })
  await fs.writeFile(file.path, file.buffer)
}

const cleanupTempFiles = async () => {
  const tempDir = path.join(__dirname, '../../temp')
  try {
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch {}
}

describe('Image Model', () => {
  beforeEach(async () => {
    await cleanupTempFiles()
  })

  afterEach(async () => {
    await cleanupTempFiles()
  })

  describe('createWithVersions', () => {
    it('should create image with all versions', async () => {
      const file = createMockFile('test-create.jpg')
      await createTempFile(file)

      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'test-create.jpg'
      }

      const result = await Image.createWithVersions(file, imageData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.originalFilename).toBe('test-create.jpg')
      expect(result.camera).toBe(DEFAULT_IMAGE_DATA.camera)
      expect(result.lens).toBe(DEFAULT_IMAGE_DATA.lens)
      expect(result.aperture).toBe(DEFAULT_IMAGE_DATA.aperture)
      expect(result.shutterSpeed).toBe(DEFAULT_IMAGE_DATA.shutterSpeed)
      expect(result.iso).toBe(DEFAULT_IMAGE_DATA.iso)
      expect(result.focalLength).toBe(DEFAULT_IMAGE_DATA.focalLength)
      expect(result.versions).toBeDefined()
      expect(Array.isArray(result.versions)).toBe(true)
      expect(result.versions.length).toBe(4)

      const versionTypes = result.versions.map((v) => v.type)
      expect(versionTypes).toContain('original')
      expect(versionTypes).toContain('regular')
      expect(versionTypes).toContain('thumbnail')
      expect(versionTypes).toContain('tiny')

      result.versions.forEach((version) => {
        expect(version.imageId).toBe(result.id)
        expect(version.height).toBeDefined()
        expect(version.width).toBeDefined()
        expect(version.size).toBeDefined()
        expect(version.path).toBeDefined()
        expect(version.mimetype).toBe(file.mimetype)
      })
    })

    it('should handle vertical images correctly', async () => {
      const file = createMockFile('vertical-test.jpg')
      await createTempFile(file)

      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'vertical-test.jpg'
      }

      const result = await Image.createWithVersions(file, imageData)

      expect(result).toBeDefined()
      expect(result.versions).toBeDefined()
      expect(result.versions.length).toBe(4)

      result.versions.forEach((version) => {
        expect(version.height).toBeGreaterThan(0)
        expect(version.width).toBeGreaterThan(0)
      })
    })

    it('should clean up temporary files after processing', async () => {
      const file = createMockFile('cleanup-test.jpg')
      await createTempFile(file)

      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'cleanup-test.jpg'
      }

      await Image.createWithVersions(file, imageData)

      try {
        await fs.access(file.path)
        throw new Error('Temp file should have been deleted')
      } catch (error) {
        expect(error.code).toBe('ENOENT')
      }
    })
  })

  describe('findAllByVersion', () => {
    beforeEach(async () => {
      const file1 = createMockFile('version-test-1.jpg')
      const file2 = createMockFile('version-test-2.jpg')
      const file3 = createMockFile('version-test-3.jpg')

      await createTempFile(file1)
      await createTempFile(file2)
      await createTempFile(file3)

      await Image.createWithVersions(file1, {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'version-test-1.jpg'
      })
      await Image.createWithVersions(file2, {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'version-test-2.jpg'
      })
      await Image.createWithVersions(file3, {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'version-test-3.jpg'
      })
    })

    it('should find all images by version type', async () => {
      const tinyVersions = await Image.findAllByVersion('tiny')

      expect(tinyVersions).toBeDefined()
      expect(Array.isArray(tinyVersions)).toBe(true)
      expect(tinyVersions.length).toBe(3)

      tinyVersions.forEach((version) => {
        expect(version.type).toBe('tiny')
      })
    })

    it('should respect column selection', async () => {
      const regularVersions = await Image.findAllByVersion('regular', {
        columns: {
          id: true,
          type: true,
          height: true,
          width: true
        }
      })

      expect(regularVersions).toBeDefined()

      regularVersions.forEach((version) => {
        expect(version.id).toBeDefined()
        expect(version.type).toBe('regular')
        expect(version.height).toBeDefined()
        expect(version.width).toBeDefined()
        expect(version.path).toBeUndefined()
        expect(version.size).toBeUndefined()
      })
    })

    it('should respect limit option', async () => {
      const limitedVersions = await Image.findAllByVersion('thumbnail', {
        limit: 2
      })

      expect(limitedVersions).toBeDefined()
      expect(limitedVersions.length).toBe(2)
    })

    it('should return empty array when no versions exist for valid type', async () => {
      await Image.db.delete(ImageVersionsTable)

      const emptyVersions = await Image.findAllByVersion('original')

      expect(emptyVersions).toBeDefined()
      expect(Array.isArray(emptyVersions)).toBe(true)
      expect(emptyVersions.length).toBe(0)
    })
  })

  describe('findAllWithVersions', () => {
    beforeEach(async () => {
      const files = []
      for (let i = 0; i < 5; i++) {
        const file = createMockFile(`versions-test-${i}.jpg`)
        await createTempFile(file)
        await Image.createWithVersions(file, {
          ...DEFAULT_IMAGE_DATA,
          originalFilename: `versions-test-${i}.jpg`,
          camera: `Test Camera ${i}`
        })
      }
    })

    it('should find all images with their versions', async () => {
      const images = await Image.findAllWithVersions()

      expect(images).toBeDefined()
      expect(Array.isArray(images)).toBe(true)
      expect(images.length).toBe(5)

      images.forEach((image) => {
        expect(image.id).toBeDefined()
        expect(image.originalFilename).toBeDefined()
        expect(image.versions).toBeDefined()
        expect(Array.isArray(image.versions)).toBe(true)
        expect(image.versions.length).toBeGreaterThan(0)

        image.versions.forEach((version) => {
          expect(version.type).toBeDefined()
          expect(version.height).toBeDefined()
          expect(version.width).toBeDefined()
          expect(version.path).toBeDefined()
        })
      })
    })

    it('should respect limit option', async () => {
      const limitedImages = await Image.findAllWithVersions({ limit: 3 })

      expect(limitedImages).toBeDefined()
      expect(limitedImages.length).toBe(3)
    })

    it('should respect offset option', async () => {
      const allImages = await Image.findAllWithVersions()
      const offsetImages = await Image.findAllWithVersions({ offset: 2 })

      expect(offsetImages).toBeDefined()
      expect(offsetImages.length).toBe(allImages.length - 2)
    })

    it('should handle limit and offset together', async () => {
      const pagedImages = await Image.findAllWithVersions({
        limit: 2,
        offset: 1
      })

      expect(pagedImages).toBeDefined()
      expect(pagedImages.length).toBe(2)
    })

    it('should handle where conditions', async () => {
      const testImage = await createImage({ camera: 'Unique Camera Model' })

      const filteredImages = await Image.findAllWithVersions({
        where: eq(ImagesTable.camera, 'Unique Camera Model')
      })

      expect(filteredImages).toBeDefined()
      expect(filteredImages.length).toBe(1)
      expect(filteredImages[0].id).toBe(testImage.id)
      expect(filteredImages[0].camera).toBe('Unique Camera Model')
    })
  })

  describe('findByIdWithVersions', () => {
    let testImage

    beforeEach(async () => {
      testImage = await createImage({
        camera: 'Test Camera Model',
        lens: 'Test Lens Model'
      })
    })

    it('should find image by id with versions', async () => {
      const foundImage = await Image.findByIdWithVersions(testImage.id)

      expect(foundImage).toBeDefined()
      expect(foundImage.id).toBe(testImage.id)
      expect(foundImage.camera).toBe('Test Camera Model')
      expect(foundImage.lens).toBe('Test Lens Model')
      expect(foundImage.versions).toBeDefined()
      expect(Array.isArray(foundImage.versions)).toBe(true)
    })

    it('should return null for non-existent id', async () => {
      const nonExistentImage = await Image.findByIdWithVersions(
        '550e8400-e29b-41d4-a716-446655440000'
      )

      expect(nonExistentImage).toBeNull()
    })
  })

  describe('inherited methods from BaseModel', () => {
    let testImage

    beforeEach(async () => {
      testImage = await createImage({
        camera: 'Inherited Test Camera',
        originalFilename: 'inherited-test.jpg'
      })
    })

    describe('findById', () => {
      it('should find image by id without versions', async () => {
        const foundImage = await Image.findById(testImage.id)

        expect(foundImage).toBeDefined()
        expect(foundImage.id).toBe(testImage.id)
        expect(foundImage.camera).toBe('Inherited Test Camera')
        expect(foundImage.originalFilename).toBe('inherited-test.jpg')
        expect(foundImage.versions).toBeUndefined()
      })

      it('should return null for non-existent id', async () => {
        const nonExistentImage = await Image.findById('550e8400-e29b-41d4-a716-446655440000')

        expect(nonExistentImage).toBeNull()
      })
    })

    describe('create', () => {
      it('should create basic image without versions', async () => {
        const imageData = {
          originalFilename: 'basic-create.jpg',
          camera: 'Basic Camera',
          lens: 'Basic Lens',
          aperture: 'f/4',
          shutterSpeed: '1/60',
          iso: 400,
          focalLength: '35mm',
          date: new Date('2023-06-01')
        }

        const createdImage = await Image.create(imageData)

        expect(createdImage).toBeDefined()
        expect(createdImage.id).toBeDefined()
        expect(createdImage.originalFilename).toBe('basic-create.jpg')
        expect(createdImage.camera).toBe('Basic Camera')
        expect(createdImage.lens).toBe('Basic Lens')
        expect(createdImage.aperture).toBe('f/4')
        expect(createdImage.shutterSpeed).toBe('1/60')
        expect(createdImage.iso).toBe(400)
        expect(createdImage.focalLength).toBe('35mm')
        expect(createdImage.date).toEqual(imageData.date)
        expect(createdImage.createdAt).toBeDefined()
        expect(createdImage.updatedAt).toBeDefined()
      })

      it('should handle optional fields', async () => {
        const minimalImageData = {
          originalFilename: 'minimal.jpg'
        }

        const createdImage = await Image.create(minimalImageData)

        expect(createdImage).toBeDefined()
        expect(createdImage.id).toBeDefined()
        expect(createdImage.originalFilename).toBe('minimal.jpg')
        expect(createdImage.camera).toBeNull()
        expect(createdImage.lens).toBeNull()
        expect(createdImage.aperture).toBeNull()
      })
    })

    describe('update', () => {
      it('should update image metadata', async () => {
        const updateData = {
          camera: 'Updated Camera Model',
          lens: 'Updated Lens Model',
          aperture: 'f/1.8',
          iso: 800
        }

        const updatedImage = await Image.update(testImage.id, updateData)

        expect(updatedImage).toBeDefined()
        expect(updatedImage.id).toBe(testImage.id)
        expect(updatedImage.camera).toBe('Updated Camera Model')
        expect(updatedImage.lens).toBe('Updated Lens Model')
        expect(updatedImage.aperture).toBe('f/1.8')
        expect(updatedImage.iso).toBe(800)
        expect(updatedImage.originalFilename).toBe(testImage.originalFilename)
        expect(updatedImage.updatedAt).toBeDefined()
      })

      it('should handle partial updates', async () => {
        const partialUpdate = {
          camera: 'Partially Updated Camera'
        }

        const updatedImage = await Image.update(testImage.id, partialUpdate)

        expect(updatedImage).toBeDefined()
        expect(updatedImage.camera).toBe('Partially Updated Camera')
        expect(updatedImage.originalFilename).toBe(testImage.originalFilename)
      })

      it('should return null for non-existent id', async () => {
        const result = await Image.update('550e8400-e29b-41d4-a716-446655440000', {
          camera: 'Non-existent'
        })

        expect(result).toBeNull()
      })
    })

    describe('delete', () => {
      it('should delete image', async () => {
        const deletedImage = await Image.delete(testImage.id)

        expect(deletedImage).toBeDefined()
        expect(deletedImage.id).toBe(testImage.id)

        const foundImage = await Image.findById(testImage.id)
        expect(foundImage).toBeNull()
      })

      it('should return null for non-existent id', async () => {
        const result = await Image.delete('550e8400-e29b-41d4-a716-446655440000')

        expect(result).toBeNull()
      })
    })

    describe('count', () => {
      beforeEach(async () => {
        await createImages(3)
      })

      it('should count all images', async () => {
        const totalCount = await Image.count()

        expect(totalCount).toBeGreaterThanOrEqual(4)
        expect(typeof totalCount).toBe('number')
      })

      it('should count images with condition', async () => {
        await createImage({ camera: 'Specific Camera Model' })
        await createImage({ camera: 'Specific Camera Model' })

        const specificCount = await Image.count(eq(ImagesTable.camera, 'Specific Camera Model'))

        expect(specificCount).toBe(2)
      })
    })

    describe('findAll', () => {
      beforeEach(async () => {
        await createImages(3)
      })

      it('should find all images', async () => {
        const allImages = await Image.findAll()

        expect(allImages).toBeDefined()
        expect(Array.isArray(allImages)).toBe(true)
        expect(allImages.length).toBeGreaterThanOrEqual(4)

        allImages.forEach((image) => {
          expect(image.id).toBeDefined()
          expect(image.originalFilename).toBeDefined()
          expect(image.createdAt).toBeDefined()
        })
      })

      it('should handle limit option', async () => {
        const limitedImages = await Image.findAll({ limit: 2 })

        expect(limitedImages).toBeDefined()
        expect(limitedImages.length).toBe(2)
      })

      it('should handle offset option', async () => {
        const allImages = await Image.findAll()
        const offsetImages = await Image.findAll({ offset: 1 })

        expect(offsetImages).toBeDefined()
        expect(offsetImages.length).toBe(allImages.length - 1)
      })

      it('should handle where conditions', async () => {
        const uniqueCamera = 'Unique Camera for FindAll'
        await createImage({ camera: uniqueCamera })

        const filteredImages = await Image.findAll({
          where: eq(ImagesTable.camera, uniqueCamera)
        })

        expect(filteredImages).toBeDefined()
        expect(filteredImages.length).toBe(1)
        expect(filteredImages[0].camera).toBe(uniqueCamera)
      })
    })

    describe('find', () => {
      it('should find first image matching condition', async () => {
        const uniqueFilename = 'unique-find-test.jpg'
        await createImage({ originalFilename: uniqueFilename })

        const foundImage = await Image.find(eq(ImagesTable.originalFilename, uniqueFilename))

        expect(foundImage).toBeDefined()
        expect(foundImage.originalFilename).toBe(uniqueFilename)
      })

      it('should return null if no match found', async () => {
        const nonExistentImage = await Image.find(
          eq(ImagesTable.originalFilename, 'non-existent.jpg')
        )

        expect(nonExistentImage).toBeNull()
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle images with special characters in filename', async () => {
      const specialFilename = 'test-image-with-special-chars.jpg'
      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: specialFilename
      }

      const createdImage = await Image.create(imageData)

      expect(createdImage).toBeDefined()
      expect(createdImage.originalFilename).toBe(specialFilename)
    })

    it('should handle null metadata fields correctly', async () => {
      const imageData = {
        originalFilename: 'null-metadata.jpg',
        camera: null,
        lens: null,
        aperture: null,
        shutterSpeed: null,
        iso: null,
        focalLength: null,
        date: null
      }

      const createdImage = await Image.create(imageData)

      expect(createdImage).toBeDefined()
      expect(createdImage.originalFilename).toBe('null-metadata.jpg')
      expect(createdImage.camera).toBeNull()
      expect(createdImage.lens).toBeNull()
      expect(createdImage.aperture).toBeNull()
      expect(createdImage.shutterSpeed).toBeNull()
      expect(createdImage.iso).toBeNull()
      expect(createdImage.focalLength).toBeNull()
      expect(createdImage.date).toBeNull()
    })

    it('should handle very large ISO values', async () => {
      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'high-iso.jpg',
        iso: 102400
      }

      const createdImage = await Image.create(imageData)

      expect(createdImage).toBeDefined()
      expect(createdImage.iso).toBe(102400)
    })

    it('should handle future dates', async () => {
      const futureDate = new Date('2030-12-31')
      const imageData = {
        ...DEFAULT_IMAGE_DATA,
        originalFilename: 'future-date.jpg',
        date: futureDate
      }

      const createdImage = await Image.create(imageData)

      expect(createdImage).toBeDefined()
      expect(createdImage.date).toEqual(futureDate)
    })
  })
})
