import { sql } from "drizzle-orm";

import Image from "../models/Image.js";
import * as imageService from "../services/imageService.js";

export const uploadForReview = async (req, res) => {
  try {
    const imageData = await imageService.uploadForReview(req.file);
    res.json({
      data: imageData,
      message: "Image uploaded and ready for review."
    });
  } catch (error) {
    console.error("Upload for review error:", error);
    res.status(400).json({ error: error.message });
  }
};

export const confirmUpload = async (req, res) => {
  try {
    const { metadata, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    const image = await imageService.confirmUpload(sessionId, metadata);
    res.json({
      image,
      message: "Image saved successfully."
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

    res.json({ data, message });
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
      const { metadata, sessionId } = item;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required." });
      }

      const image = await imageService.confirmUpload(sessionId, metadata);
      images.push(image);
    }

    res.json({
      images,
      message: `${images.length} images saved successfully.`
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

export const fetchTiny = async (req, res) => {
  try {
    const images = await Image.findAllByVersion("tiny", {
      columns: {
        height: true,
        path: true,
        size: true,
        width: true
      },
      limit: 24,
      orderBy: sql`random()`
    });

    const querySize = images.reduce((accumulator, image) => {
      return accumulator + image.size;
    }, 0);

    const querySizeKb = (querySize / 1024).toFixed(2);

    // eslint-disable-next-line no-console
    console.log(`Total size of ${images.length} tiny images: ${querySizeKb}`);
    res.json(images);
  } catch (error) {
    console.error("Fetch tiny images error:", error);
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
      image,
      message: "Image metadata updated successfully."
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
