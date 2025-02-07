import 'dotenv/config'

export default {
  schema: './api/drizzle/schema.js',
  out: './api/drizzle/migrations',
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  dbCredentials: {
    url: process.env.DB_URL
  }
}
