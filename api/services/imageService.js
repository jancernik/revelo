import Image from "../models/Image.js";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import exifr from "exifr";
import sharp from "sharp";
import { eq } from "drizzle-orm";

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
      sessionId,
      filePath: tempFilePath,
      metadata
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
      originalFilename,
      iso: metadata.iso || null,
      aperture: metadata.aperture || null,
      shutterSpeed: metadata.shutterSpeed || null,
      focalLength: metadata.focalLength || null,
      camera: metadata.camera || null,
      lens: metadata.lens || null,
      date: metadata.date ? new Date(metadata.date) : null
    };

    const fileObject = {
      originalname: originalFilename,
      path: tempFilePath,
      mimetype: `image/${(await sharp(tempFilePath).metadata())?.format?.toLowerCase()}`,
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
    camera: (raw.Make || raw.Model) && `${raw.Make || ""}${raw.Model ? ` ${raw.Model}` : ""}`,
    lens: raw.LensModel,
    shutterSpeed:
      raw.ExposureTime &&
      (raw.ExposureTime < 1 ? `1/${Math.round(1 / raw.ExposureTime)}` : `${raw.ExposureTime}`),
    aperture: raw.FNumber?.toString(),
    focalLength: raw.FocalLength?.toString(),
    iso: raw.ISO?.toString(),
    date:
      (raw.DateTimeOriginal || raw.CreateDate) &&
      (raw.DateTimeOriginal || raw.CreateDate).toISOString().split("T")[0]
  };
};

export const upload = async (file) => {
  if (!file) {
    throw new Error("Missing file.");
  }

  const newImage = await Image.create({
    filename: file.filename,
    path: path.join("uploads", file.filename),
    mimetype: file.mimetype,
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
        await fs.rm(imageDir, { recursive: true, force: true });
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
      scanned: tempFiles.length,
      deleted: deletedCount,
      errors: errorCount
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
          await fs.rm(dirPath, { recursive: true, force: true });
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
      scanned: scannedCount,
      deleted: deletedCount,
      errors: errorCount
    };
  } catch (error) {
    throw new Error(`Error cleaning up orphaned files: ${error.message}`);
  }
};

export const findAll = async () => {
  return await Image.findAll();
};
