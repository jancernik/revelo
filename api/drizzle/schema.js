import {
  pgTable,
  varchar,
  timestamp,
  serial,
  boolean,
  integer,
  bigint,
  pgEnum,
  unique,
  primaryKey
} from "drizzle-orm/pg-core";

export const UserTables = pgTable("users", {
  id: serial("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const RevokedTokensTable = pgTable("revoked_tokens", {
  token: varchar("token").primaryKey().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const ImagesTable = pgTable("images", {
  id: serial("id").primaryKey().notNull(),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  iso: integer("iso"),
  aperture: varchar("aperture", { length: 50 }),
  shutterSpeed: varchar("shutter_speed", { length: 50 }),
  focalLength: varchar("focal_length", { length: 50 }),
  camera: varchar("camera", { length: 255 }),
  lens: varchar("lens", { length: 255 }),
  date: timestamp("date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const ImageVersionTypes = pgEnum("image_version_types", ["original", "regular", "thumbnail"]);

export const ImageVersionsTable = pgTable(
  "image_versions",
  {
    id: serial("id").primaryKey().notNull(),
    imageId: serial("image_id")
      .references(() => ImagesTable.id, { onDelete: "cascade" })
      .notNull(),
    mimetype: varchar("mimetype", { length: 100 }).notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    type: ImageVersionTypes("type").notNull(),
    path: varchar("path").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => {
    return {
      uniqueImageVersion: unique("unique_image_version").on(table.imageId, table.type)
    };
  }
);

export const PostsTable = pgTable("posts", {
  id: serial("id").primaryKey().notNull(),
  title: varchar("title", { length: 255 }),
  description: varchar("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const PostImagesTable = pgTable(
  "post_images",
  {
    postId: serial("post_id")
      .references(() => PostsTable.id, { onDelete: "cascade" })
      .notNull(),
    imageId: serial("image_id")
      .references(() => ImagesTable.id, { onDelete: "cascade" })
      .notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => {
    return {
      uniqueOrder: unique("unique_order").on(table.imageId, table.postId, table.order),
      primaryKey: primaryKey({ columns: [table.imageId, table.postId] })
    };
  }
);

export const SettingsTable = pgTable("settings", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("name").unique().notNull(),
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
