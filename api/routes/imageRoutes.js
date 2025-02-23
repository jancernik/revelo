import { Router } from "express";
import multer from "multer";
import { uploadImage, fetchAllImages } from "../controllers/imageController.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post("/upload", upload.single("image"), uploadImage);
router.get("/images", fetchAllImages);

export default router;
