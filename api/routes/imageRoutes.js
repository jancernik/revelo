import { Router } from "express";
import multer from "multer";
import { uploadImage, fetchAllImages } from "../controllers/imageController.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    await uploadImage(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading image.", error });
  }
});

router.get("/images", async (req, res) => {
  try {
    await fetchAllImages(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching images.", error });
  }
});

export default router;
