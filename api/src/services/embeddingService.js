import { config } from "#src/config/environment.js"
import { AppError } from "#src/core/errors.js"
import fs from "fs"

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

export const generateImageEmbedding = async (imagePath) => {
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

export const generateTextEmbedding = async (text) => {
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
