import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

import { ImagesTable, ImageVersionsTable } from "../drizzle/schema.js";
import BaseModel from "./BaseModel.js";

const WITH_VERSIONS_QUERY = {
  columns: {
    aperture: true,
    camera: true,
    date: true,
    focalLength: true,
    id: true,
    iso: true,
    lens: true,
    shutterSpeed: true
  },
  with: {
    versions: {
      columns: {
        height: true,
        path: true,
        type: true,
        width: true
      }
    }
  }
};

const uploadsDir = path.join("uploads");

class Image extends BaseModel {
  constructor() {
    super(ImagesTable);
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

  async findAllByVersion(version, options = {}) {
    const { columns, limit, orderBy } = options;

    const query = this.db.query.ImageVersionsTable.findMany({
      columns: columns || undefined,
      limit: limit || undefined,
      orderBy: orderBy || undefined,
      where: eq(ImageVersionsTable.type, version)
    });

    return await query;
  }

  async findAllWithVersions(options = {}) {
    const { limit, offset, orderBy, where } = options;

    let query = this.db.query.ImagesTable.findMany({
      ...WITH_VERSIONS_QUERY,
      orderBy: orderBy || undefined,
      where: where || undefined
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
      ...WITH_VERSIONS_QUERY,
      where: eq(this.table.id, id)
    });

    return result || null;
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
      },
      tiny: {
        height: isVertical ? Math.round(150 * (metadata.height / metadata.width)) : 150,
        width: isVertical ? 150 : Math.round(150 * (metadata.width / metadata.height))
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
            fit: "inside",
            height: size.height,
            width: size.width,
            withoutEnlargement: true
          })
          .toFile(outputPath);
      }

      const stats = await fs.stat(outputPath);
      const outputMeta = await sharp(outputPath).metadata();

      const versionData = {
        height: outputMeta.height,
        imageId,
        mimetype: file.mimetype,
        path: outputPath,
        size: stats.size,
        type,
        width: outputMeta.width
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
}

export default new Image();
