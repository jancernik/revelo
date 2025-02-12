import 'dotenv/config'
import './drizzle/migrate.js'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/authRoutes.js'

const requiredEnvVars = ['PORT', 'DB_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  process.exit(1)
}

const PORT = process.env.PORT

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

app.use(cors({ origin: '*', credentials: true }))

app.use(authRoutes)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
