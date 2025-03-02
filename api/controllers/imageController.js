import * as imageService from "../services/imageService.js";

export const upload = async (req, res) => {
  try {
    const image = await imageService.upload(req.file);
    res.json({ message: "File uploaded successfully.", image });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const fetchAll = async (req, res) => {
  try {
    const images = await imageService.findAll();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
