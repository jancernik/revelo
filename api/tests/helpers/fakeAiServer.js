import { createHash } from "crypto"
import http from "http"

import { config } from "#src/config/environment.js"
import { searchConfig } from "#src/config/search.js"

const DIMENSIONS = 768
export const DESCRIBE_MODEL = "fake-describe-model"

export const unitVector = (degrees) => {
  const vector = new Array(DIMENSIONS).fill(0)
  vector[0] = Math.cos((degrees * Math.PI) / 180)
  vector[1] = Math.sin((degrees * Math.PI) / 180)
  return vector
}

export const degreesForSimilarity = (similarity) => (Math.acos(similarity) * 180) / Math.PI

const hashedVector = (data) =>
  unitVector(createHash("sha1").update(data).digest().readUInt16BE(0) % 360)

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on("data", (chunk) => chunks.push(chunk))
    req.on("end", () => resolve(Buffer.concat(chunks)))
  })

const parseFields = (body, contentType) => {
  const boundary = Buffer.from(`--${contentType.split("boundary=")[1]}`)
  const fields = {}
  let start = body.indexOf(boundary)

  while (start !== -1) {
    const end = body.indexOf(boundary, start + boundary.length)
    if (end === -1) break
    const part = body.subarray(start + boundary.length + 2, end - 2)
    const split = part.indexOf("\r\n\r\n")
    const name = part
      .subarray(0, split)
      .toString()
      .match(/name="([^"]+)"/)[1]
    fields[name] = part.subarray(split + 4)
    start = end
  }

  return fields
}

export async function startFakeAiServer() {
  const fake = {
    described: 0,
    describeMode: "healthy",
    gate: null,
    mode: "healthy",
    model: searchConfig.model,
    rejectImages: false,
    requests: [],
    searchReady: true,
    textEmbeddings: new Map()
  }

  const server = http.createServer(async (req, res) => {
    const fields =
      req.method === "POST" ? parseFields(await readBody(req), req.headers["content-type"]) : {}
    const content = fields.image ?? fields.text ?? null
    fake.requests.push({ content, fields, path: req.url })

    const send = (statusCode, body) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body))
    }

    if (fake.mode === "slow") return
    if (fake.mode === "failing") return send(500, { message: "failing", status: "error" })

    if (req.url === "/health") {
      return send(200, {
        search: { model: fake.model, ready: fake.searchReady },
        status: "healthy"
      })
    }
    if (req.url === "/embed/text") {
      const text = content.toString()
      const embedding = fake.textEmbeddings.get(text) ?? hashedVector(text)
      return send(200, { data: { embedding, model: fake.model }, status: "success" })
    }
    if (fake.rejectImages === "html") {
      res.writeHead(413, { "Content-Type": "text/html" })
      return res.end("<html><body>Request Entity Too Large</body></html>")
    }
    if (fake.rejectImages) return send(400, { message: "unreadable", status: "error" })
    if (req.url === "/embed/image") {
      await fake.gate
      return send(200, {
        data: { embedding: hashedVector(content), model: fake.model },
        status: "success"
      })
    }
    if (req.url === "/describe/image") {
      if (fake.describeMode === "failing") return send(500, { message: "failing", status: "error" })
      fake.described++
      return send(200, {
        data: { language: "en", model: DESCRIBE_MODEL, text: `Description ${fake.described}` },
        status: "success"
      })
    }
    if (req.url === "/translate") {
      if (fake.describeMode === "failing") return send(500, { message: "failing", status: "error" })
      const target = fields.target.toString()
      if (!["de", "es"].includes(target)) {
        return send(400, { message: "Unsupported target language", status: "error" })
      }
      return send(200, {
        data: { language: target, model: DESCRIBE_MODEL, text: `${target}: ${fields.text}` },
        status: "success"
      })
    }
    send(404, { message: "not found", status: "error" })
  })

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const url = `http://127.0.0.1:${server.address().port}`

  fake.reset = () => {
    fake.described = 0
    fake.describeMode = "healthy"
    fake.gate = null
    fake.mode = "healthy"
    fake.model = searchConfig.model
    fake.rejectImages = false
    fake.requests.length = 0
    fake.searchReady = true
    fake.textEmbeddings.clear()
    config.AI_BASE_URL = url
  }
  fake.requestsTo = (path) => fake.requests.filter((request) => request.path === path)
  fake.stop = () => {
    server.closeAllConnections()
    return new Promise((resolve) => server.close(resolve))
  }

  return fake
}
