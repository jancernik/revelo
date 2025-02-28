import Image from "../models/ImageModel.js";
import path from "path";

export const uploadImageService = async (file) => {
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

export const fetchAllImagesService = async () => {
  return await Image.findAll();
};
