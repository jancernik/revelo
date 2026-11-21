import type { Collection, Image, UploadedImage } from "#src/types/models"

export const gridImage = (id = "image", hidden = false): Image => ({
  aperture: null,
  camera: null,
  collectionId: null,
  collectionOrder: null,
  comment: null,
  date: null,
  descriptions: { en: `Description ${id}` },
  focalLength: null,
  focalLengthEquivalent: null,
  hidden,
  id,
  iso: null,
  lens: null,
  shutterSpeed: null,
  versions: [
    {
      height: 100,
      path: `/thumb/${id}`,
      size: 100,
      storageType: "local",
      type: "thumbnail",
      width: 100
    }
  ]
})

export const uploadedGridImage = (): UploadedImage => ({
  ...gridImage("uploaded"),
  createdAt: "2026-01-01",
  originalFilename: "original.jpg",
  updatedAt: "2026-01-01"
})

export const gridCollection = (id = "collection", count = 1): Collection => ({
  createdAt: "2026-01-01",
  description: null,
  id,
  images: Array.from({ length: count }, (_, i) => gridImage(`${id}-${i}`)),
  title: `Title ${id}`,
  updatedAt: "2026-01-01"
})
