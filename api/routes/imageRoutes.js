import { Router } from "express";
import multer from "multer";
import {
  uploadForReview,
  confirmUpload,
  fetchAll,
  fetchById,
  uploadBatchForReview,
  confirmBatchUpload
} from "../controllers/imageController.js";
import { requireAuth, loadUser } from "../middlewares/authMiddleware.js";

const router = Router();

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

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const singleUpload = multerUpload.single("image");
const batchUpload = multerUpload.array("images", 10);

router.post("/upload/review", requireAuth, loadUser, singleUpload, uploadForReview);
router.post("/upload/confirm", requireAuth, loadUser, confirmUpload);
router.post("/upload/batch-review", requireAuth, loadUser, batchUpload, uploadBatchForReview);
router.post("/upload/batch-confirm", requireAuth, loadUser, confirmBatchUpload);
router.get("/images", fetchAll);
router.get("/images/:id", fetchById);

export default router;
