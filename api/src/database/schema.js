import { relations } from "drizzle-orm"
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  timestamp,
  unique,
  uuid,
  varchar,
  vector
} from "drizzle-orm/pg-core"

export const UserTables = pgTable("users", {
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: varchar("email").unique().notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  id: serial("id").primaryKey().notNull(),
  password: varchar("password").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  username: varchar("username").unique().notNull()
})

export const EmailVerificationTokensTable = pgTable("email_verification_tokens", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: varchar("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  id: serial("id").primaryKey().notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  used: boolean("used").notNull().default(false),
  userId: integer("user_id")
    .notNull()
    .references(() => UserTables.id, { onDelete: "cascade" })
})

export const RevokedTokensTable = pgTable("revoked_tokens", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  token: varchar("token").primaryKey().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
})

export const ImagesTable = pgTable(
  "images",
  {
    aperture: varchar("aperture", { length: 50 }),
    camera: varchar("camera", { length: 255 }),
    caption: varchar("caption", { length: 1000 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    date: timestamp("date"),
    embedding: vector("embedding", { dimensions: 768 }),
    focalLength: varchar("focal_length", { length: 50 }),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    iso: integer("iso"),
    lens: varchar("lens", { length: 255 }),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    shutterSpeed: varchar("shutter_speed", { length: 50 }),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => {
    return {
      embeddingIndex: index("embedding_index").using(
        "hnsw",
        table.embedding.op("vector_cosine_ops")
      )
    }
  }
)

export const ImageVersionTypes = pgEnum("image_version_types", [
  "original",
  "regular",
  "thumbnail",
  "tiny"
])

export const ImageVersionsTable = pgTable(
  "image_versions",
  {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    height: integer("height").notNull(),
    id: serial("id").primaryKey().notNull(),
    imageId: uuid("image_id")
      .references(() => ImagesTable.id, { onDelete: "cascade" })
      .notNull(),
    mimetype: varchar("mimetype", { length: 100 }).notNull(),
    path: varchar("path").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    type: ImageVersionTypes("type").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    width: integer("width").notNull()
  },
  (table) => {
    return {
      uniqueImageVersion: unique("unique_image_version").on(table.imageId, table.type)
    }
  }
)

export const PostsTable = pgTable("posts", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  description: varchar("description"),
  id: serial("id").primaryKey().notNull(),
  title: varchar("title", { length: 255 }),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
})

export const PostImagesTable = pgTable(
  "post_images",
  {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    imageId: uuid("image_id")
      .references(() => ImagesTable.id, { onDelete: "cascade" })
      .notNull(),
    order: integer("order").notNull(),
    postId: serial("post_id")
      .references(() => PostsTable.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (table) => {
    return {
      primaryKey: primaryKey({ columns: [table.imageId, table.postId] }),
      uniqueOrder: unique("unique_order").on(table.imageId, table.postId, table.order)
    }
  }
)

export const SettingsTable = pgTable("settings", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: serial("id").primaryKey().notNull(),
  name: varchar("name").unique().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  value: varchar("value").notNull()
})

export const ImagesTableRelations = relations(ImagesTable, ({ many }) => ({
  postsImages: many(PostImagesTable),
  versions: many(ImageVersionsTable)
}))

export const ImageVersionsTableRelations = relations(ImageVersionsTable, ({ one }) => ({
  image: one(ImagesTable, {
    fields: [ImageVersionsTable.imageId],
    references: [ImagesTable.id]
  })
}))

export const PostsTableRelations = relations(PostsTable, ({ many }) => ({
  images: many(PostImagesTable)
}))

export const PostImagesTableRelations = relations(PostImagesTable, ({ one }) => ({
  image: one(ImagesTable, {
    fields: [PostImagesTable.imageId],
    references: [ImagesTable.id]
  }),
  post: one(PostsTable, {
    fields: [PostImagesTable.postId],
    references: [PostsTable.id]
  })
}))
