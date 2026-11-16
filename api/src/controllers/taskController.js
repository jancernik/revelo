import * as taskService from "#src/services/taskService.js"

export const cleanupStagedImages = async (_req, res) => {
  const result = await taskService.cleanupStagedImages()

  res.status(200).json({
    data: { result },
    status: "success"
  })
}

export const cleanupOrphanedImages = async (_req, res) => {
  const result = await taskService.cleanupOrphanedImages()

  res.status(200).json({
    data: { result },
    status: "success"
  })
}

export const backfillEmbeddings = async (req, res) => {
  const { force } = req.parsedQuery
  const result = await taskService.backfillEmbeddings(force)

  res.status(200).json({
    data: { result },
    status: "success"
  })
}

export const backfillDescriptions = async (req, res) => {
  const { force } = req.parsedQuery
  const result = await taskService.backfillDescriptions(force)

  res.status(200).json({
    data: { result },
    status: "success"
  })
}
