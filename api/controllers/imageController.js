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

export const uploadBatchForReview = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    const data = [];
    for (const file of req.files) {
      const imageData = await imageService.uploadForReview(file);
      data.push(imageData);
    }

    const message =
      data.length === 1
        ? "Image uploaded and ready for review."
        : `${data.length} images uploaded and ready for review.`;

    res.json({ message, data });
  } catch (error) {
    console.error("Batch upload for review error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const confirmBatchUpload = async (req, res) => {
  try {
    const { batch } = req.body;

    if (!batch || !Array.isArray(batch) || batch.length === 0) {
      return res.status(400).json({ error: "Invalid batch data." });
    }

    const images = [];
    for (const item of batch) {
      const { sessionId, metadata } = item;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required." });
      }

      const image = await imageService.confirmUpload(sessionId, metadata);
      images.push(image);
    }

    res.json({
      message: `${images.length} images saved successfully.`,
      images
    });
  } catch (error) {
    console.error("Batch confirm and save error:", error);
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

    const image = await Image.findByIdWithVersions(id);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    console.error("Fetch by ID error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = req.body;

    const image = await imageService.updateImageMetadata(id, metadata);

    res.json({
      message: "Image metadata updated successfully.",
      image
    });
  } catch (error) {
    console.error("Update metadata error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    await imageService.deleteImage(id);

    res.json({
      message: "Image deleted successfully."
    });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const cleanupTemp = async (req, res) => {
  try {
    const result = await imageService.cleanupTempFiles();

    res.json({
      message: `Temporary files cleanup completed. Deleted ${result.deleted} of ${result.scanned} files.`,
      result
    });
  } catch (error) {
    console.error("Cleanup temp error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const cleanupOrphaned = async (req, res) => {
  try {
    const result = await imageService.cleanupOrphanedFiles();

    res.json({
      message: `Orphaned files cleanup completed. Deleted ${result.deleted} of ${result.scanned} files.`,
      result
    });
  } catch (error) {
    console.error("Cleanup orphaned error:", error);
    res.status(500).json({ error: error.message });
  }
};
