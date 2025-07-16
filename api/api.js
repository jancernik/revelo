import { config } from "./config.js"
import { createApi } from "./createApi.js"

const app = createApi({
  enableLogging: true,
  uploadsDir: "uploads"
})

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`)
})
