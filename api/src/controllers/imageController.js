import { sql } from "drizzle-orm"

import Image from "../models/Image.js"
import * as imageService from "../services/imageService.js"

export const uploadForReview = async (req, res) => {
  const files = req.files

  const imageData = []
  for (const file of files) {
    const uploadedImageData = await imageService.uploadForReview(file)
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
  const { limit, offset } = req.parsedQuery

  const options = {}
  if (limit) options.limit = limit
  if (offset) options.offset = offset

  const images = await Image.findAllWithVersions(options)

  res.status(200).json({
    data: { images, metadata: options },
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
  const image = await imageService.fetchById(id)

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

export const cleanupTemp = async (_req, res) => {
  const result = await imageService.cleanupTempFiles()

  res.status(200).json({
    data: { result },
    status: "success"
  })
}

export const cleanupOrphaned = async (_req, res) => {
  const result = await imageService.cleanupOrphanedFiles()

  res.status(200).json({
    data: { result },
    status: "success"
  })
}
