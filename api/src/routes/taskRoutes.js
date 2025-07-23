import {
  backfillCaptions,
  backfillEmbeddings,
  cleanupOrphanedImages,
  cleanupStagedImages
} from "#src/controllers/taskController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import { backfillCaptionsSchemas, backfillEmbeddingsSchemas } from "#src/validation/taskSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/tasks/cleanup/images/staged", auth.required(), cleanupStagedImages)
router.post("/tasks/cleanup/images/orphaned", auth.required(), cleanupOrphanedImages)
router.post(
  "/tasks/backfill/embeddings",
  auth.required(),
  validate(backfillEmbeddingsSchemas),
  backfillEmbeddings
)
router.post(
  "/tasks/backfill/captions",
  auth.required(),
  validate(backfillCaptionsSchemas),
  backfillCaptions
)

export default router
