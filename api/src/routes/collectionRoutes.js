import {
  bulkDeleteCollections,
  createCollection,
  deleteCollection,
  fetchAllCollections,
  fetchCollectionById,
  setCollectionImages,
  updateCollection
} from "#src/controllers/collectionController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  bulkDeleteCollectionsSchemas,
  createCollectionSchemas,
  deleteCollectionSchemas,
  fetchAllCollectionsSchemas,
  fetchCollectionByIdSchemas,
  setCollectionImagesSchemas,
  updateCollectionSchemas
} from "#src/validation/collectionSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/collections", auth.required(), validate(createCollectionSchemas), createCollection)
router.get("/collections", validate(fetchAllCollectionsSchemas), fetchAllCollections)
router.delete(
  "/collections",
  auth.required(),
  validate(bulkDeleteCollectionsSchemas),
  bulkDeleteCollections
)
router.get("/collections/:id", validate(fetchCollectionByIdSchemas), fetchCollectionById)
router.put("/collections/:id", auth.required(), validate(updateCollectionSchemas), updateCollection)
router.delete(
  "/collections/:id",
  auth.required(),
  validate(deleteCollectionSchemas),
  deleteCollection
)
router.put(
  "/collections/:id/images",
  auth.required(),
  validate(setCollectionImagesSchemas),
  setCollectionImages
)

export default router
