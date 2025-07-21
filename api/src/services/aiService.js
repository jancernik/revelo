import { config } from "#src/config/environment.js"
import { AppError } from "#src/core/errors.js"
import fs from "fs"

class AiQueue {
  constructor() {
    this.queue = []
    this.processing = false
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ reject, resolve, task })
      this.processNext()
    })
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    const { reject, resolve, task } = this.queue.shift()

    try {
      const result = await task()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      this.processing = false
      setTimeout(() => this.processNext(), 100)
    }
  }
}

export const aiQueue = new AiQueue()

const makeRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30000)
  })

  const json = await response.json()
  if (json.status !== "success") {
    throw new AppError("Embedding service failed", {
      data: { json, response },
      isOperational: false
    })
  }

  return json.data
}

const requestImageCaption = async (imagePath) => {
  if (config.ENV === "test") return "Test caption"

  const baseUrl = config.EMBEDDINGS_BASE_URL

  try {
    const fileBuffer = fs.readFileSync(imagePath)
    const blob = new Blob([fileBuffer])
    const formData = new FormData()
    formData.append("image", blob, "image.jpg")

    const result = await makeRequest(`${baseUrl}/caption/image`, {
      body: formData,
      method: "POST"
    })

    return result.caption
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new AppError("Embedding service timed out", { data: { error }, isOperational: false })
    }
    throw new AppError(`Failed to generate image caption`, {
      data: { error },
      isOperational: false
    })
  }
}

const requestImageEmbedding = async (imagePath) => {
  if (config.ENV === "test") return new Array(768).fill(0.19)

  const baseUrl = config.EMBEDDINGS_BASE_URL

  try {
    const fileBuffer = fs.readFileSync(imagePath)
    const blob = new Blob([fileBuffer])
    const formData = new FormData()
    formData.append("image", blob, "image.jpg")

    const result = await makeRequest(`${baseUrl}/embedding/image`, {
      body: formData,
      method: "POST"
    })

    return result.embedding
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new AppError("Embedding service timed out", { data: { error }, isOperational: false })
    }
    throw new AppError(`Failed to generate image embedding`, {
      data: { error },
      isOperational: false
    })
  }
}

const requestTextEmbedding = async (text) => {
  if (config.ENV === "test") return new Array(768).fill(0.21)

  const baseUrl = config.EMBEDDINGS_BASE_URL

  try {
    const formData = new FormData()
    formData.append("text", text)

    const result = await makeRequest(`${baseUrl}/embedding/text`, {
      body: formData,
      method: "POST"
    })

    return result.embedding
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new AppError("Embedding service timed out", { data: { error }, isOperational: false })
    }
    throw new AppError(`Failed to generate text embedding`, {
      data: { error },
      isOperational: false
    })
  }
}

export const generateImageCaption = async (imagePath) => {
  return aiQueue.add(() => requestImageCaption(imagePath))
}

export const generateImageEmbedding = async (imagePath) => {
  return aiQueue.add(() => requestImageEmbedding(imagePath))
}

export const generateTextEmbedding = async (text) => {
  return aiQueue.add(() => requestTextEmbedding(text))
}
