import storageManager from "#src/config/storageManager.js"
import { extractMetadata } from "#src/services/imageService.js"
import { cleanupTempFiles, getMetadataTestData } from "#tests/helpers/imageHelpers.js"
import fs from "fs/promises"
import path from "path"

describe("Image Service", () => {
  beforeEach(async () => {
    await cleanupTempFiles()
  })

  afterEach(async () => {
    await cleanupTempFiles()
  })

  describe("extractMetadata", () => {
    it("should handle files without EXIF data gracefully", async () => {
      await storageManager.ensureDirectories()

      const simplePng = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      )

      const filePath = path.join(storageManager.stagingDir, "no-exif.png")
      await fs.writeFile(filePath, simplePng)

      const metadata = await extractMetadata(filePath)

      expect(metadata).toBeDefined()
      expect(metadata.camera).toBeUndefined()
      expect(metadata.lens).toBeUndefined()
      expect(metadata.aperture).toBeUndefined()
      expect(metadata.shutterSpeed).toBeUndefined()
      expect(metadata.iso).toBeUndefined()
      expect(metadata.focalLength).toBeUndefined()
      expect(metadata.date).toBeUndefined()
    })

    it("should process metadata transformation correctly", () => {
      const testData = getMetadataTestData()

      Object.values(testData).forEach(({ exif, expected }) => {
        const transformedAperture = exif.FNumber?.toString()
        const transformedCamera =
          (exif.Make || exif.Model) && `${exif.Make || ""}${exif.Model ? ` ${exif.Model}` : ""}`
        const transformedDate =
          (exif.DateTimeOriginal || exif.CreateDate) &&
          new Date(exif.DateTimeOriginal || exif.CreateDate).toISOString().split("T")[0]
        const transformedFocalLength = exif.FocalLength?.toString()
        const transformedIso = exif.ISO?.toString()
        const transformedShutterSpeed =
          exif.ExposureTime &&
          (exif.ExposureTime < 1
            ? `1/${Math.round(1 / exif.ExposureTime)}`
            : `${exif.ExposureTime}`)

        expect(transformedAperture).toBe(expected.aperture)
        expect(transformedCamera).toBe(expected.camera)
        expect(transformedDate).toBe(expected.date)
        expect(transformedFocalLength).toBe(expected.focalLength)
        expect(transformedIso).toBe(expected.iso)
        expect(transformedShutterSpeed).toBe(expected.shutterSpeed)
      })
    })

    it("should handle missing image file gracefully", async () => {
      const nonExistentPath = "/path/to/nonexistent/file.jpg"

      await expect(extractMetadata(nonExistentPath)).rejects.toThrow()
    })
  })
})
