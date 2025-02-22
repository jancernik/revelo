import { pgTable, varchar, timestamp, serial, boolean } from "drizzle-orm/pg-core";

export const UserTable = pgTable("user", {
  id: serial("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const RevokedTokenTable = pgTable("revoked_token", {
  token: varchar("token").primaryKey().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const ImageTable = pgTable("image", {
  id: serial("id").primaryKey().notNull(),
  filename: varchar("filename").notNull(),
  mimetype: varchar("mimetype").notNull(),
  path: varchar("path").notNull(),
  size: varchar("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
