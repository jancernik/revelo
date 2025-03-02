import Image from "../models/Image.js";
import path from "path";

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
