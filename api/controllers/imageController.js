import path from "path";
import { db } from "../db.js";
import { ImageTable } from "../drizzle/schema.js";

export const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Missing file." });

  await db.insert(ImageTable).values({
    filename: req.file.filename,
    path: path.join("uploads", req.file.filename),
    mimetype: req.file.mimetype,
    size: req.file.size.toString()
  });

  res.json({ message: "File uploaded successfully." });
};

export const fetchAllImages = async (req, res) => {
  const allImages = await db.select().from(ImageTable);
  res.json(allImages);
};
