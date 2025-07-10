import { Router } from "express";
import multer from "multer";

import {
  cleanupOrphaned,
  cleanupTemp,
  confirmBatchUpload,
  confirmUpload,
  deleteImage,
  fetchAll,
  fetchById,
  fetchTiny,
  updateMetadata,
  uploadBatchForReview,
  uploadForReview
} from "../controllers/imageController.js";
import { auth } from "../middlewares/authMiddleware.js";
import Setting from "../models/Setting.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${file.originalname.split(".").pop()}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return cb(new Error("Only images are allowed"), false);
  }
  cb(null, true);
};

const dynamicSingleUpload = async (req, res, next) => {
  try {
    const maxUploadSize = await Setting.get("maxUploadSize", { includeRestricted: true });

    const upload = multer({
      fileFilter,
      limits: { fileSize: maxUploadSize.value * 1024 * 1024 },
      storage
    }).single("image");

    upload(req, res, next);
  } catch (error) {
    next(error);
  }
};

const dynamicBatchUpload = async (req, res, next) => {
  try {
    const maxUploadSize = await Setting.get("maxUploadSize", { includeRestricted: true });
    const maxUploadFiles = await Setting.get("maxUploadFiles", { includeRestricted: true });

    const upload = multer({
      fileFilter,
      limits: { fileSize: maxUploadSize.value * 1024 * 1024 },
      storage
    }).array("images", maxUploadFiles.value);

    upload(req, res, next);
  } catch (error) {
    next(error);
  }
};

const router = Router();

router.post("/upload/review", auth.required(), dynamicSingleUpload, uploadForReview);
router.post("/upload/confirm", auth.required(), confirmUpload);
router.post("/upload/batch-review", auth.required(), dynamicBatchUpload, uploadBatchForReview);
router.post("/upload/batch-confirm", auth.required(), confirmBatchUpload);
router.get("/images", fetchAll);
router.get("/tiny-images", fetchTiny);
router.get("/images/:id", fetchById);
router.put("/images/:id/metadata", auth.required(), updateMetadata);
router.delete("/images/:id", auth.required(), deleteImage);
router.post("/maintenance/cleanup-temp", auth.required(), cleanupTemp);
router.post("/maintenance/cleanup-orphaned", auth.required(), cleanupOrphaned);

export default router;
