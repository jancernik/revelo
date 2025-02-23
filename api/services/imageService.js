import { ImageModel } from "../models/imageModel.js";
import path from "path";

const imageModel = new ImageModel();

export const uploadImageService = async (file) => {
  if (!file) {
    throw new Error("Missing file.");
  }

  const newImage = await imageModel.create({
    filename: file.filename,
    path: path.join("uploads", file.filename),
    mimetype: file.mimetype,
    size: file.size.toString()
  });

  return newImage;
};

export const fetchAllImagesService = async () => {
  return await imageModel.findAll();
};
