import { config } from "#src/config/environment.js"
import { createServer } from "#src/createServer.js"

const app = createServer({
  enableLogging: true,
  uploadsDir: "uploads"
})

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`)
})
