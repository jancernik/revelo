import { eq } from "drizzle-orm";
import exifr from "exifr";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";

import Image from "../models/Image.js";

const uploadsDir = path.join("uploads");
const tempUploadsDir = path.join("uploads", "temp");

export const uploadForReview = async (file) => {
  if (!file) {
    throw new Error("Missing file.");
  }

  try {
    const sessionId = uuid();
    await fs.mkdir(tempUploadsDir, { recursive: true });

    const tempFilePath = path.join(tempUploadsDir, `${sessionId}-${file.originalname}`);
    await fs.copyFile(file.path, tempFilePath);

    const metadata = await extractMetadata(tempFilePath);

    await fs.unlink(file.path);

    return {
      filePath: tempFilePath,
      metadata,
      sessionId
    };
  } catch (error) {
    throw new Error(`Error uploading file for review: ${error.message}`);
  }
};

export const confirmUpload = async (sessionId, metadata) => {
  const tempFiles = await fs.readdir(tempUploadsDir);
  const sessionFile = tempFiles.find((file) => file.startsWith(sessionId));

  if (!sessionFile) {
    throw new Error("Upload session expired or not found.");
  }

  try {
    const tempFilePath = path.join(tempUploadsDir, sessionFile);
    const originalFilename = sessionFile
      .split(`${sessionId}-`)[1]
      .replace(/\.[^.]+$/, (ext) => ext.toLowerCase());

    const imageData = {
      aperture: metadata.aperture || null,
      camera: metadata.camera || null,
      date: metadata.date ? new Date(metadata.date) : null,
      focalLength: metadata.focalLength || null,
      iso: metadata.iso || null,
      lens: metadata.lens || null,
      originalFilename,
      shutterSpeed: metadata.shutterSpeed || null
    };

    const fileObject = {
      mimetype: `image/${(await sharp(tempFilePath).metadata())?.format?.toLowerCase()}`,
      originalname: originalFilename,
      path: tempFilePath,
      size: (await fs.stat(tempFilePath)).size
    };

    return await Image.createWithVersions(fileObject, imageData);
  } catch (error) {
    throw new Error(`Error confirming upload: ${error.message}`);
  }
};

export const extractMetadata = async (filePath) => {
  const raw = (await exifr.parse(filePath)) || {};
  return {
    aperture: raw.FNumber?.toString(),
    camera: (raw.Make || raw.Model) && `${raw.Make || ""}${raw.Model ? ` ${raw.Model}` : ""}`,
    date:
      (raw.DateTimeOriginal || raw.CreateDate) &&
      (raw.DateTimeOriginal || raw.CreateDate).toISOString().split("T")[0],
    focalLength: raw.FocalLength?.toString(),
    iso: raw.ISO?.toString(),
    lens: raw.LensModel,
    shutterSpeed:
      raw.ExposureTime &&
      (raw.ExposureTime < 1 ? `1/${Math.round(1 / raw.ExposureTime)}` : `${raw.ExposureTime}`)
  };
};

export const upload = async (file) => {
  if (!file) {
    throw new Error("Missing file.");
  }

  const newImage = await Image.create({
    filename: file.filename,
    mimetype: file.mimetype,
    path: path.join("uploads", file.filename),
    size: file.size.toString()
  });

  return newImage;
};

export const updateImageMetadata = async (id, metadata) => {
  try {
    const image = await Image.findByIdWithVersions(id);

    if (!image) {
      throw new Error("Image not found");
    }

    const updateData = {};

    if (metadata.iso !== undefined) updateData.iso = metadata.iso;
    if (metadata.aperture !== undefined) updateData.aperture = metadata.aperture;
    if (metadata.shutterSpeed !== undefined) updateData.shutterSpeed = metadata.shutterSpeed;
    if (metadata.focalLength !== undefined) updateData.focalLength = metadata.focalLength;
    if (metadata.camera !== undefined) updateData.camera = metadata.camera;
    if (metadata.lens !== undefined) updateData.lens = metadata.lens;
    if (metadata.date !== undefined) {
      updateData.date = metadata.date ? new Date(metadata.date) : null;
    }

    const updatedImageResult = await Image.db
      .update(Image.table)
      .set(updateData)
      .where(eq(Image.table.id, id))
      .returning();

    if (!updatedImageResult.length) {
      throw new Error("Failed to update image metadata");
    }

    return await Image.findByIdWithVersions(id);
  } catch (error) {
    throw new Error(`Error updating image metadata: ${error.message}`);
  }
};

export const deleteImage = async (id) => {
  try {
    const image = await Image.findByIdWithVersions(id);

    if (!image) {
      throw new Error("Image not found");
    }

    return await Image.db.transaction(async (tx) => {
      await tx.delete(Image.table).where(eq(Image.table.id, id));

      const imageDir = path.join(uploadsDir, id.toString());
      try {
        await fs.rm(imageDir, { force: true, recursive: true });
      } catch (error) {
        console.error(`Error deleting image files: ${error.message}`);
      }

      return true;
    });
  } catch (error) {
    throw new Error(`Error deleting image: ${error.message}`);
  }
};

export const cleanupTempFiles = async () => {
  try {
    await fs.mkdir(tempUploadsDir, { recursive: true });

    const tempFiles = await fs.readdir(tempUploadsDir);

    const timeThreshold = Date.now() - 1 * 60 * 60 * 1000;

    let deletedCount = 0;
    let errorCount = 0;

    for (const file of tempFiles) {
      const filePath = path.join(tempUploadsDir, file);

      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() < timeThreshold) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error processing temp file ${file}: ${error.message}`);
        errorCount++;
      }
    }

    return {
      deleted: deletedCount,
      errors: errorCount,
      scanned: tempFiles.length
    };
  } catch (error) {
    throw new Error(`Error cleaning up temp files: ${error.message}`);
  }
};

export const cleanupOrphanedFiles = async () => {
  try {
    const images = await Image.findAllWithVersions();

    const validPaths = new Set();

    for (const image of images) {
      for (const version of image.versions) {
        validPaths.add(version.path);
      }
    }

    const uploadDirs = await fs.readdir(uploadsDir, { withFileTypes: true });

    let scannedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    for (const dir of uploadDirs) {
      if (dir.name === "temp" || !dir.isDirectory()) {
        continue;
      }

      const imageId = parseInt(dir.name, 10);

      if (isNaN(imageId) || !images.some((img) => img.id === imageId)) {
        try {
          const dirPath = path.join(uploadsDir, dir.name);
          await fs.rm(dirPath, { force: true, recursive: true });
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting orphaned directory ${dir.name}: ${err.message}`);
          errorCount++;
        }
        continue;
      }

      const imageDir = path.join(uploadsDir, dir.name);
      const files = await fs.readdir(imageDir);

      for (const file of files) {
        const filePath = path.join(imageDir, file);
        scannedCount++;

        if (!validPaths.has(filePath)) {
          try {
            await fs.unlink(filePath);
            deletedCount++;
          } catch (err) {
            console.error(`Error deleting orphaned file ${filePath}: ${err.message}`);
            errorCount++;
          }
        }
      }
    }

    return {
      deleted: deletedCount,
      errors: errorCount,
      scanned: scannedCount
    };
  } catch (error) {
    throw new Error(`Error cleaning up orphaned files: ${error.message}`);
  }
};

export const findAll = async () => {
  return await Image.findAll();
};
