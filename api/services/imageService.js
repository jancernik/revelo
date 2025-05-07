import Image from "../models/Image.js";
import path from "path";
import fs from "fs/promises";
import { v4 as uuid } from "uuid";
import exifr from "exifr";
import sharp from "sharp";

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

export const findAll = async () => {
  return await Image.findAll();
};
