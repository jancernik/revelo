import { Router } from "express";

import {
  cleanupOrphaned,
  cleanupTemp,
  confirmUpload,
  deleteImage,
  fetchAll,
  fetchById,
  fetchTiny,
  updateMetadata,
  uploadForReview
} from "../controllers/imageController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { uploadImages } from "../middlewares/uploadMiddleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validationMiddleware.js";
import {
  confirmUploadSchema,
  fetchImageSchema,
  fetchImagesSchema,
  updateMetadataSchema
} from "../validation/imageSchemas.js";

const router = Router();

router.post("/upload/review", auth.required(), uploadImages, uploadForReview);
router.post("/upload/confirm", auth.required(), validateBody(confirmUploadSchema), confirmUpload);
router.get("/images", validateQuery(fetchImagesSchema), fetchAll);
router.get("/tiny-images", fetchTiny);
router.get("/images/:id", validateParams(fetchImageSchema), fetchById);
router.put(
  "/images/:id/metadata",
  auth.required(),
  validateParams(fetchImageSchema),
  validateBody(updateMetadataSchema),
  updateMetadata
);
router.delete("/images/:id", auth.required(), validateParams(fetchImageSchema), deleteImage);
router.post("/maintenance/cleanup-temp", auth.required(), cleanupTemp);
router.post("/maintenance/cleanup-orphaned", auth.required(), cleanupOrphaned);

export default router;
