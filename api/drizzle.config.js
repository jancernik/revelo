import { config } from "#src/config/environment.js"

export default {
  dbCredentials: {
    url: `postgres://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`
  },
  dialect: "postgresql",
  out: "./src/database/migrations",
  schema: "./src/database/schema.js",
  strict: true,
  verbose: true
}
