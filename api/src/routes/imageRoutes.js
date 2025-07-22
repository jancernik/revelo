import {
  backfillCaptions,
  backfillEmbeddings,
  cleanupOrphaned,
  cleanupTemp,
  confirmUpload,
  deleteImage,
  fetchAll,
  fetchById,
  fetchTiny,
  search,
  updateMetadata,
  uploadForReview
} from "#src/controllers/imageController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { uploadImages } from "#src/middlewares/uploadMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  backfillCaptionsSchemas,
  backfillEmbeddingsSchemas,
  confirmUploadSchemas,
  deleteImageSchemas,
  fetchAllSchemas,
  fetchByIdSchemas,
  searchSchemas,
  updateMetadataSchemas
} from "#src/validation/imageSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/upload/review", auth.required(), uploadImages, uploadForReview)
router.post("/upload/confirm", auth.required(), validate(confirmUploadSchemas), confirmUpload)
router.get("/images", validate(fetchAllSchemas), fetchAll)
router.get("/tiny-images", fetchTiny)
router.get("/images/search", validate(searchSchemas), search)
router.get("/images/:id", validate(fetchByIdSchemas), fetchById)
router.put("/images/:id/metadata", auth.required(), validate(updateMetadataSchemas), updateMetadata)
router.delete("/images/:id", auth.required(), validate(deleteImageSchemas), deleteImage)
router.post("/maintenance/cleanup-temp", auth.required(), cleanupTemp)
router.post("/maintenance/cleanup-orphaned", auth.required(), cleanupOrphaned)
router.post(
  "/maintenance/backfill-embeddings",
  auth.required(),
  validate(backfillEmbeddingsSchemas),
  backfillEmbeddings
)
router.post(
  "/maintenance/backfill-captions",
  auth.required(),
  validate(backfillCaptionsSchemas),
  backfillCaptions
)

export default router
