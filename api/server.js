import { config } from "#src/config/environment.js"
import { createServer } from "#src/createServer.js"

const app = createServer({ enableLogging: true })

app.listen(config.API_PORT, () => {
  console.log(`Server is running on port ${config.API_PORT}`)
})
