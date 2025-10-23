import { spawn, spawnSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { config } from "../api/src/config/environment.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectDir = path.resolve(__dirname)
const venvDir = path.join(projectDir, ".venv")
const pythonInVenv = path.join(venvDir, "bin", "python")

function runSyncOrThrow(cmd, args = [], opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts })
  if (res.error) throw res.error
  if (res.status !== 0) throw new Error(`Command failed: ${cmd} ${args.join(" ")}`)
}

function ensureVenv() {
  if (fs.existsSync(pythonInVenv)) return
  try {
    runSyncOrThrow(process.env.PYTHON || "python", ["-m", "venv", venvDir], { cwd: projectDir })
  } catch (e) {
    runSyncOrThrow("python3", ["-m", "venv", venvDir], { cwd: projectDir })
  }
}

ensureVenv()

runSyncOrThrow(pythonInVenv, ["-m", "pip", "install",  "--upgrade", "pip"], { cwd: projectDir })

const reqFile = path.join(projectDir, "requirements.txt")
if (fs.existsSync(reqFile)) {
  runSyncOrThrow(pythonInVenv, ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: projectDir })
}

console.log(`Starting AI service on port ${config.AI_PORT}`)

const python = spawn(
  pythonInVenv,
  ["-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", String(config.AI_PORT)],
  { env: { ...process.env }, stdio: "inherit", cwd: projectDir }
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
