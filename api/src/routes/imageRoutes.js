import {
  bulkDeleteImages,
  bulkDownloadImages,
  bulkUpdateMetadata,
  confirmUpload,
  deleteImage,
  downloadImage,
  fetchAll,
  fetchById,
  search,
  updateMetadata,
  uploadForReview
} from "#src/controllers/imageController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { uploadImages } from "#src/middlewares/uploadMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  bulkDeleteImagesSchemas,
  bulkDownloadImagesSchemas,
  bulkUpdateMetadataSchemas,
  confirmUploadSchemas,
  deleteImageSchemas,
  downloadImageSchemas,
  fetchAllSchemas,
  fetchByIdSchemas,
  searchSchemas,
  updateMetadataSchemas
} from "#src/validation/imageSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/upload/review", auth.required(), uploadImages, uploadForReview)
router.post("/upload/confirm", auth.required(), validate(confirmUploadSchemas), confirmUpload)
router.get("/images", auth.optional(), validate(fetchAllSchemas), fetchAll)
router.get("/images/search", auth.optional(), validate(searchSchemas), search)
router.post(
  "/images/download",
  auth.required(),
  validate(bulkDownloadImagesSchemas),
  bulkDownloadImages
)
router.delete("/images", auth.required(), validate(bulkDeleteImagesSchemas), bulkDeleteImages)
router.put(
  "/images/metadata",
  auth.required(),
  validate(bulkUpdateMetadataSchemas),
  bulkUpdateMetadata
)
router.get("/images/:id", auth.optional(), validate(fetchByIdSchemas), fetchById)
router.get("/images/:id/download", auth.required(), validate(downloadImageSchemas), downloadImage)
router.put("/images/:id/metadata", auth.required(), validate(updateMetadataSchemas), updateMetadata)
router.delete("/images/:id", auth.required(), validate(deleteImageSchemas), deleteImage)

export default router
