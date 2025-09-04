import {
  createCollection,
  deleteCollection,
  fetchAllCollections,
  fetchCollectionById,
  updateCollection
} from "#src/controllers/collectionController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  createCollectionSchemas,
  deleteCollectionSchemas,
  fetchAllCollectionsSchemas,
  fetchCollectionByIdSchemas,
  updateCollectionSchemas
} from "#src/validation/collectionSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/collections", auth.required(), validate(createCollectionSchemas), createCollection)
router.get("/collections", validate(fetchAllCollectionsSchemas), fetchAllCollections)
router.get("/collections/:id", validate(fetchCollectionByIdSchemas), fetchCollectionById)
router.put("/collections/:id", auth.required(), validate(updateCollectionSchemas), updateCollection)
router.delete(
  "/collections/:id",
  auth.required(),
  validate(deleteCollectionSchemas),
  deleteCollection
)

export default router
