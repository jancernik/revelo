import 'dotenv/config'
import './drizzle/migrate.js'
import express from 'express'
import cors from 'cors'

const PORT = process.env.PORT || 8080

const app = express()
app.use(express.json())

app.use(cors({ origin: '*' }))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
