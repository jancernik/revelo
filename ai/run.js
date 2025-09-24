import { spawn } from "child_process"

import { config } from "../api/src/config/environment.js"

console.log(`Starting AI service on port ${config.AI_PORT}`)

const python = spawn(
  "python3",
  ["-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", config.AI_PORT],
  {
    env: { ...process.env },
    stdio: "inherit"
  }
)

python.on("error", (error) => {
  console.error("Failed to start AI service", error)
  process.exit(1)
})

python.on("close", (code) => {
  process.exit(code)
})

python.on("exit", (code) => {
  process.exit(code)
})

process.on("SIGINT", () => {
  console.log("Shutting down AI service...")
  python.kill("SIGINT")
})

process.on("SIGTERM", () => {
  console.log("Shutting down AI service...")
  python.kill("SIGTERM")
})
