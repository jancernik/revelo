import { config } from './api/config.js'

export default {
  schema: './api/drizzle/schema.js',
  out: './api/drizzle/migrations',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  dbCredentials: {
    url: config.DB_URL
  }
}
