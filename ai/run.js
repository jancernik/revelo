import { spawn, spawnSync } from "child_process"
import crypto from "crypto"
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

async function ensureLlamaServer() {
  if (process.env.LLAMA_SERVER_PATH) return process.env.LLAMA_SERVER_PATH

  const dockerfile = fs.readFileSync(path.join(projectDir, "Dockerfile"), "utf8")
  const build = dockerfile.match(/^ARG LLAMA_BUILD=(\S+)/m)[1]
  const sha256 = dockerfile.match(/^ARG LLAMA_SHA256=(\S+)/m)[1]
  const installDir = path.join(projectDir, ".llama", build)
  const binary = path.join(installDir, "llama-server")
  if (fs.existsSync(binary)) return binary

  if (process.platform !== "linux" || process.arch !== "x64") {
    console.warn(
      "No llama-server for this platform. Set LLAMA_SERVER_PATH to enable image descriptions."
    )
    return null
  }

  console.log(`Downloading llama.cpp ${build}...`)
  const url = `https://github.com/ggml-org/llama.cpp/releases/download/${build}/llama-${build}-bin-ubuntu-x64.tar.gz`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed with status ${response.status}: ${url}`)
  const archive = Buffer.from(await response.arrayBuffer())
  if (crypto.createHash("sha256").update(archive).digest("hex") !== sha256) {
    throw new Error("The llama.cpp download does not match the expected checksum")
  }

  const archivePath = path.join(projectDir, ".llama", `${build}.tar.gz`)
  fs.mkdirSync(installDir, { recursive: true })
  fs.writeFileSync(archivePath, archive)
  try {
    runSyncOrThrow("tar", ["-xzf", archivePath, "-C", installDir, "--strip-components=1"])
  } catch (error) {
    fs.rmSync(installDir, { force: true, recursive: true })
    throw error
  } finally {
    fs.rmSync(archivePath)
  }

  return binary
}

ensureVenv()

const reqFile = path.join(projectDir, "requirements.txt")
if (fs.existsSync(reqFile)) {
  runSyncOrThrow(pipInVenv, ["install", "-r", "requirements.txt"], { cwd: projectDir })
}

const llamaServer = await ensureLlamaServer()

console.log(`Starting AI service on port ${config.AI_PORT}`)

const python = spawn(
  pythonInVenv,
  ["-m", "uvicorn", "app:app", "--reload", "--host", "0.0.0.0", "--port", String(config.AI_PORT)],
  {
    cwd: projectDir,
    env: { ...process.env, ...(llamaServer && { LLAMA_SERVER_PATH: llamaServer }) },
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

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("Shutting down AI service...")
    python.kill(signal)
  })
}
