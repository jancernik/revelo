import { uploadImageService, fetchAllImagesService } from "../services/imageService.js";

export const uploadImage = async (req, res) => {
  try {
    const image = await uploadImageService(req.file);
    res.json({ message: "File uploaded successfully.", image });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const fetchAllImages = async (req, res) => {
  try {
    const images = await fetchAllImagesService();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
