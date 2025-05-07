import * as imageService from "../services/imageService.js";
import Image from "../models/Image.js";

export const uploadForReview = async (req, res) => {
  try {
    const imageData = await imageService.uploadForReview(req.file);
    res.json({
      message: "Image uploaded and ready for review.",
      data: imageData
    });
  } catch (error) {
    console.error("Upload for review error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const confirmUpload = async (req, res) => {
  try {
    const { sessionId, metadata } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    const image = await imageService.confirmUpload(sessionId, metadata);
    res.json({
      message: "Image saved successfully.",
      image
    });
  } catch (error) {
    console.error("Confirm and save error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const fetchAll = async (req, res) => {
  try {
    const { limit, offset, orderBy } = req.query;

    const options = {};
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);
    if (orderBy) options.orderBy = JSON.parse(orderBy);

    const images = await Image.findAllWithVersions(options);
    res.json(images);
  } catch (error) {
    console.error("Fetch all error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const fetchById = async (req, res) => {
  try {
    const { id } = req.params;

    const image = await Image.findByIdWithVersions(parseInt(id, 10));

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    console.error("Fetch by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};
