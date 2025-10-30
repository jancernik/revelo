import { ImagesTable } from "#src/database/schema.js"
import Image from "#src/models/Image.js"
import Setting from "#src/models/Setting.js"
import * as imageService from "#src/services/imageService.js"
import { desc, sql } from "drizzle-orm"

export const uploadForReview = async (req, res) => {
  const files = req.files

  const [replaceCameraNames, replaceLensNames] = await Promise.all([
    Setting.get("replaceCameraNames", { includeRestricted: true }).catch(() => ({ value: [] })),
    Setting.get("replaceLensNames", { includeRestricted: true }).catch(() => ({ value: [] }))
  ])

  const replacementOptions = {
    replaceCameraNames: replaceCameraNames.value || [],
    replaceLensNames: replaceLensNames.value || []
  }

  const imageData = []
  for (const file of files) {
    const uploadedImageData = await imageService.uploadForReview(file, replacementOptions)
    imageData.push(uploadedImageData)
  }

  res.status(201).json({
    data: { images: imageData },
    status: "success"
  })
}

export const confirmUpload = async (req, res) => {
  const { images } = req.body

  const imageData = []
  for (const image of images) {
    const { metadata, sessionId } = image
    const confirmedImageData = await imageService.confirmUpload(sessionId, metadata)
    imageData.push(confirmedImageData)
  }

  res.status(201).json({
    data: { images: imageData },
    status: "success"
  })
}

export const fetchAll = async (req, res) => {
  const { limit, offset, order, orderBy } = req.parsedQuery

  const options = {}
  const metadata = {}

  if (limit) {
    options.limit = limit
    metadata.limit = limit
  }
  if (offset) {
    options.offset = offset
    metadata.offset = offset
  }

  if (orderBy) {
    const field = ImagesTable[orderBy]
    const direction = order === "asc" ? "asc" : "desc"
    options.orderBy = direction === "desc" ? desc(field) : field
    metadata.orderBy = orderBy
    metadata.order = direction
  }

  const images = await Image.findAllWithVersions(options)

  res.status(200).json({
    data: { images, metadata },
    status: "success"
  })
}

export const fetchTiny = async (req, res) => {
  const options = {
    columns: {
      height: true,
      path: true,
      width: true
    },
    limit: 24,
    orderBy: sql`random()`
  }

  const images = await Image.findAllByVersion("tiny", options)

  res.status(200).json({
    data: { images },
    status: "success"
  })
}

export const fetchById = async (req, res) => {
  const { id } = req.params
  const image = await imageService.fetchByIdWithVersions(id)

  res.status(200).json({
    data: { image },
    status: "success"
  })
}

export const updateMetadata = async (req, res) => {
  const { id } = req.params
  const metadata = req.body
  const image = await imageService.updateImageMetadata(id, metadata)

  res.status(200).json({
    data: { image },
    status: "success"
  })
}

export const deleteImage = async (req, res) => {
  const { id } = req.params
  await imageService.deleteImage(id)

  res.status(200).json({
    data: null,
    status: "success"
  })
}

export const search = async (req, res) => {
  const { limit, offset, text } = req.parsedQuery

  const options = {}
  if (limit) options.limit = limit
  if (offset) options.offset = offset

  const images = await imageService.searchWithVersions(text, options)

  res.status(200).json({
    data: { images, metadata: options },
    status: "success"
  })
}
