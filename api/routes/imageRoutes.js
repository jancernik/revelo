import { Router } from "express";
import multer from "multer";
import {
  uploadForReview,
  confirmUpload,
  fetchAll,
  fetchById
} from "../controllers/imageController.js";
import { requireAuth, loadUser } from "../middlewares/authMiddleware.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}.${file.originalname.split(".").pop()}`;
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

router.post("/upload/review", requireAuth, loadUser, multerUpload.single("image"), uploadForReview);
router.post("/upload/confirm", requireAuth, loadUser, confirmUpload);
router.get("/images", fetchAll);
router.get("/images/:id", fetchById);

export default router;
