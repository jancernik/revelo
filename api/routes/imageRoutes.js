import { Router } from "express";
import multer from "multer";
import { upload, fetchAll } from "../controllers/imageController.js";

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

const multerUpload = multer({ storage });

router.post("/upload", multerUpload.single("image"), upload);
router.get("/images", fetchAll);

export default router;
