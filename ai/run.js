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
const pipInVenv = path.join(venvDir, "bin", "pip")

function runSyncOrThrow(cmd, args = [], opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts })
  if (res.error) throw res.error
  if (res.status !== 0) throw new Error(`Command failed: ${cmd} ${args.join(" ")}`)
}

function pipWorks() {
  if (!fs.existsSync(pipInVenv)) return false
  const res = spawnSync(pipInVenv, ["--version"], { stdio: "pipe" })
  return res.status === 0
}

function ensureVenv() {
  if (fs.existsSync(venvDir) && !pipWorks()) {
    console.log("Virtual environment exists but pip is broken. Recreating...")
    fs.rmSync(venvDir, { recursive: true, force: true })
  }

  if (fs.existsSync(pythonInVenv)) return

  console.log("Creating virtual environment...")
  try {
    runSyncOrThrow(process.env.PYTHON || "python", ["-m", "venv", venvDir], { cwd: projectDir })
  } catch {
    runSyncOrThrow("python3", ["-m", "venv", venvDir], { cwd: projectDir })
  }

  if (!pipWorks()) {
    console.log("Bootstrapping pip via ensurepip...")
    try {
      runSyncOrThrow(pythonInVenv, ["-m", "ensurepip", "--upgrade"], { cwd: projectDir })
    } catch (e) {
      console.error("Failed to bootstrap pip via ensurepip.")
      throw e
    }
  }

  runSyncOrThrow(pipInVenv, ["install", "--upgrade", "pip"], { cwd: projectDir })
}

ensureVenv()

const reqFile = path.join(projectDir, "requirements.txt")
if (fs.existsSync(reqFile)) {
  runSyncOrThrow(pipInVenv, ["install", "-r", "requirements.txt"], { cwd: projectDir })
}

console.log(`Starting AI service on port ${config.AI_PORT}`)

const python = spawn(
  pythonInVenv,
  ["-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", String(config.AI_PORT)],
  { stdio: "inherit", cwd: projectDir }
)

python.on("error", (error) => {
  console.error("Failed to start AI service", error)
  process.exit(1)
})

python.on("close", (code) => {
  process.exit(code)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("Shutting down AI service...")
    python.kill(signal)
  })
}
