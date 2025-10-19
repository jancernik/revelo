import { config } from "#src/config/environment.js"
import { AppError } from "#src/core/errors.js"
import fs from "fs"

class RequestQueue {
  constructor() {
    this.queue = []
    this.processing = false
  }

  async add(task, priority = false) {
    return new Promise((resolve, reject) => {
      const item = { reject, resolve, task }
      if (priority) {
        this.queue.unshift(item)
      } else {
        this.queue.push(item)
      }
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

const requestQueue = new RequestQueue()

const serviceState = {
  consecutiveFailures: 0,
  cooldownPeriod: 30000,
  failureThreshold: 5,
  healthCheckTTL: 10000,
  isHealthy: true,
  lastHealthCheck: 0,
  unavailableUntil: 0
}

export const checkAiServiceHealth = async () => {
  const now = Date.now()

  if (now - serviceState.lastHealthCheck < serviceState.healthCheckTTL) {
    return serviceState.isHealthy
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${config.AI_BASE_URL}/health`, {
      signal: controller.signal
    })
    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      serviceState.isHealthy = data.status === "healthy" && data.models_loaded === true
    } else {
      serviceState.isHealthy = false
    }
  } catch {
    serviceState.isHealthy = false
  }

  serviceState.lastHealthCheck = now
  return serviceState.isHealthy
}

const isServiceAvailable = () => {
  const now = Date.now()

  if (serviceState.unavailableUntil > now) {
    return false
  }

  if (serviceState.unavailableUntil > 0 && serviceState.unavailableUntil <= now) {
    serviceState.consecutiveFailures = 0
    serviceState.unavailableUntil = 0
  }

  return true
}

const recordFailure = () => {
  serviceState.consecutiveFailures++

  if (serviceState.consecutiveFailures >= serviceState.failureThreshold) {
    serviceState.unavailableUntil = Date.now() + serviceState.cooldownPeriod
    serviceState.isHealthy = false
  }
}

const recordSuccess = () => {
  serviceState.consecutiveFailures = 0
  serviceState.unavailableUntil = 0
}

const makeRequest = async (url, options = {}) => {
  if (!isServiceAvailable()) {
    throw new AppError("AI service temporarily unavailable", {
      isOperational: true,
      statusCode: 503
    })
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000)
    })

    const json = await response.json()

    if (json.status !== "success") {
      throw new AppError("AI service request failed", {
        data: { response: json },
        isOperational: false
      })
    }

    recordSuccess()
    return json.data
  } catch (error) {
    recordFailure()

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new AppError("AI service request timed out", {
        isOperational: true,
        statusCode: 504
      })
    }

    if (error.code === "ECONNREFUSED" || error.name === "FetchError") {
      throw new AppError("AI service connection failed", {
        isOperational: true,
        statusCode: 503
      })
    }

    throw error
  }
}

const retryRequest = async (fn, maxRetries = 2) => {
  let lastError

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!error.isOperational || error.statusCode === 503) {
        throw error
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

const requestImageCaption = async (imagePath) => {
  if (config.ENV === "test") {
    return { en: "Test caption EN", es: "Test caption ES" }
  }

  return await retryRequest(async () => {
    const fileBuffer = fs.readFileSync(imagePath)
    const blob = new Blob([fileBuffer])
    const formData = new FormData()
    formData.append("image", blob, "image.jpg")

    const result = await makeRequest(`${config.AI_BASE_URL}/caption/image`, {
      body: formData,
      method: "POST"
    })

    return result.captions
  })
}

const requestImageEmbedding = async (imagePath) => {
  if (config.ENV === "test") {
    return new Array(512).fill(0.19)
  }

  return await retryRequest(async () => {
    const fileBuffer = fs.readFileSync(imagePath)
    const blob = new Blob([fileBuffer])
    const formData = new FormData()
    formData.append("image", blob, "image.jpg")

    const result = await makeRequest(`${config.AI_BASE_URL}/embedding/image`, {
      body: formData,
      method: "POST"
    })

    return result.embedding
  })
}

const requestTextEmbedding = async (text) => {
  if (config.ENV === "test") {
    return new Array(512).fill(0.21)
  }

  return await retryRequest(async () => {
    const formData = new FormData()
    formData.append("text", text)

    const result = await makeRequest(`${config.AI_BASE_URL}/embedding/text`, {
      body: formData,
      method: "POST"
    })

    return result.embedding
  })
}

export const generateImageCaption = async (imagePath, options = {}) => {
  const { highPriority = false } = options
  return requestQueue.add(() => requestImageCaption(imagePath), highPriority)
}

export const generateImageEmbedding = async (imagePath, options = {}) => {
  const { highPriority = false } = options
  return requestQueue.add(() => requestImageEmbedding(imagePath), highPriority)
}

export const generateTextEmbedding = async (text, options = {}) => {
  const { highPriority = false } = options
  return requestQueue.add(() => requestTextEmbedding(text), highPriority)
}
