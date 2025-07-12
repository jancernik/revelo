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
import { validate } from "../middlewares/validationMiddleware.js";
import {
  confirmUploadSchemas,
  deleteImageSchemas,
  fetchAllSchemas,
  fetchByIdSchemas,
  updateMetadataSchemas
} from "../validation/imageSchemas.js";

const router = Router();

router.post("/upload/review", auth.required(), uploadImages, uploadForReview);
router.post("/upload/confirm", auth.required(), validate(confirmUploadSchemas), confirmUpload);
router.get("/images", validate(fetchAllSchemas), fetchAll);
router.get("/tiny-images", fetchTiny);
router.get("/images/:id", validate(fetchByIdSchemas), fetchById);
router.put("/images/:id/metadata", auth.required(), validate(updateMetadataSchemas), updateMetadata);
router.delete("/images/:id", auth.required(), validate(deleteImageSchemas), deleteImage);
router.post("/maintenance/cleanup-temp", auth.required(), cleanupTemp);
router.post("/maintenance/cleanup-orphaned", auth.required(), cleanupOrphaned);

export default router;
