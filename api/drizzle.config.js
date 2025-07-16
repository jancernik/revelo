import { config } from "./config.js"

export default {
  dbCredentials: {
    url: config.DB_URL
  },
  dialect: "postgresql",
  out: "./drizzle/migrations",
  schema: "./drizzle/schema.js",
  strict: true,
  verbose: true
}
