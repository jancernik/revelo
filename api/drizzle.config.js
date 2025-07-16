import { config } from "#src/config/environment.js"

export default {
  dbCredentials: {
    url: config.DB_URL
  },
  dialect: "postgresql",
  out: "#src/database/migrations",
  schema: "#src/database/schema.js",
  strict: true,
  verbose: true
}
