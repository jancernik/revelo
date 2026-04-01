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

export const bulkDeleteCollections = async (req, res) => {
  const { ids } = req.body
  await collectionService.bulkDeleteCollections(ids)

  res.status(200).json({
    data: null,
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

  const options = { includeHidden: !!(req.user?.admin && req.parsedQuery.includeHidden) }
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
  const collection = await collectionService.fetchCollectionById(id, {
    includeHidden: !!(req.user?.admin && req.parsedQuery.includeHidden)
  })

  res.status(200).json({
    data: { collection },
    status: "success"
  })
}

export const downloadCollection = async (req, res) => {
  const { id } = req.params
  const { archive, filename } = await collectionService.downloadCollection(id)

  res.set({
    "Content-Disposition": `attachment; filename="${filename}.zip"`,
    "Content-Type": "application/zip"
  })
  archive.pipe(res)
  archive.finalize()
}

export const bulkDownloadCollections = async (req, res) => {
  const { ids } = req.body
  const archive = await collectionService.downloadCollections(ids)

  res.set({
    "Content-Disposition": `attachment; filename="collections-${Date.now()}.zip"`,
    "Content-Type": "application/zip"
  })
  archive.pipe(res)
  archive.finalize()
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
