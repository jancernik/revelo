import * as collectionService from "#src/services/collectionService.js"

export const createCollection = async (req, res) => {
  const data = req.body
  const collection = await collectionService.createCollection(data)

  res.status(201).json({
    data: { collection },
    status: "success"
  })
}

export const updateCollection = async (req, res) => {
  const { id } = req.params
  const data = req.body
  const collection = await collectionService.updateCollection(id, data)

  res.status(200).json({
    data: { collection },
    status: "success"
  })
}

export const deleteCollection = async (req, res) => {
  const { id } = req.params
  await collectionService.deleteCollection(id)

  res.status(200).json({
    data: null,
    status: "success"
  })
}

export const fetchAllCollections = async (req, res) => {
  const { limit, offset } = req.parsedQuery

  const options = {}
  if (limit) options.limit = limit
  if (offset) options.offset = offset

  const collections = await collectionService.fetchAllCollections(options)

  res.status(200).json({
    data: { collections, metadata: options },
    status: "success"
  })
}

export const fetchCollectionById = async (req, res) => {
  const { id } = req.params
  const collection = await collectionService.fetchCollectionById(id)

  res.status(200).json({
    data: { collection },
    status: "success"
  })
}

export const setCollectionImages = async (req, res) => {
  const { id } = req.params
  const { imageIds } = req.body
  const collection = await collectionService.setCollectionImages(id, imageIds)

  res.status(200).json({
    data: { collection },
    status: "success"
  })
}
