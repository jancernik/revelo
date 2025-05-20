import { BaseModel } from "./BaseModel.js";
import { ImagesTable, ImageVersionsTable } from "../drizzle/schema.js";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";
import { eq } from "drizzle-orm";

const uploadsDir = path.join("uploads");

export class Image extends BaseModel {
  constructor() {
    super(ImagesTable);
  }

  async #createImageVersions(tx, file, imageId, imageDir) {
    const versions = [];
    const originalFilePath = file.path;
    const originalFilename = `original.${file.originalname.split(".").pop()}`;
    const originalOutputPath = path.join(imageDir, originalFilename);
    await sharp(originalFilePath).rotate().toFile(originalOutputPath);

    const metadata = await sharp(originalOutputPath).metadata();
    const isVertical = metadata.height > metadata.width;

    const sizes = {
      original: {
        height: metadata.height,
        width: metadata.width
      },
      regular: {
        height: isVertical ? Math.round(2000 * (metadata.height / metadata.width)) : 2000,
        width: isVertical ? 2000 : Math.round(2000 * (metadata.width / metadata.height))
      },
      thumbnail: {
        height: isVertical ? Math.round(800 * (metadata.height / metadata.width)) : 800,
        width: isVertical ? 800 : Math.round(800 * (metadata.width / metadata.height))
      }
    };

    for (const [type, size] of Object.entries(sizes)) {
      const filename = `${type}.${file.originalname.split(".").pop()}`;
      const outputPath = path.join(imageDir, filename);

      if (type === "original") {
        if (outputPath !== originalOutputPath) {
          await fs.copyFile(originalOutputPath, outputPath);
        }
      } else {
        await sharp(originalOutputPath)
          .resize({
            width: size.width,
            height: size.height,
            fit: "inside",
            withoutEnlargement: true
          })
          .toFile(outputPath);
      }

      const stats = await fs.stat(outputPath);
      const outputMeta = await sharp(outputPath).metadata();

      const versionData = {
        imageId,
        mimetype: file.mimetype,
        size: stats.size,
        width: outputMeta.width,
        height: outputMeta.height,
        type,
        path: outputPath
      };

      const versionResult = await tx.insert(ImageVersionsTable).values(versionData).returning();

      versions.push(versionResult[0]);
    }
    await fs.unlink(originalFilePath);

    if (
      originalOutputPath !== path.join(imageDir, `original.${file.originalname.split(".").pop()}`)
    ) {
      await fs.unlink(originalOutputPath);
    }

    return versions;
  }

  async createWithVersions(file, data) {
    return await this.db.transaction(async (tx) => {
      const result = await tx.insert(this.table).values(data).returning();
      const image = result[0];

      const imageDir = path.join(uploadsDir, image.id.toString());
      await fs.mkdir(imageDir, { recursive: true });

      const versions = await this.#createImageVersions(tx, file, image.id, imageDir);

      return {
        ...image,
        versions
      };
    });
  }

  async findAllWithVersions(options = {}) {
    const { limit, offset, orderBy, where } = options;

    let query = this.db.query.ImagesTable.findMany({
      with: {
        versions: true
      },
      where: where || undefined,
      orderBy: orderBy || undefined
    });

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    if (offset !== undefined) {
      query = query.offset(offset);
    }

    return await query;
  }

  async findByIdWithVersions(id) {
    const result = await this.db.query.ImagesTable.findFirst({
      where: eq(this.table.id, id),
      with: {
        versions: true
      }
    });

    return result || null;
  }
}

export default new Image();
