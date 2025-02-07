import {
  pgTable,
  varchar,
  timestamp,
  serial,
} from 'drizzle-orm/pg-core'

export const UserTable = pgTable('user', {
  id: serial('id').primaryKey().notNull(),
  email: varchar('email').unique().notNull(),
  username: varchar('username').unique().notNull(),
  password: varchar('password').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
