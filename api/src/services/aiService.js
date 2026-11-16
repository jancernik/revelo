import { config } from "#src/config/environment.js"
import { searchConfig } from "#src/config/search.js"
import { AppError } from "#src/core/errors.js"

const timeouts = {
  describe: 300000,
  embedImage: 30000,
  embedText: 5000,
  health: 5000,
  translate: 120000
}

const cooldownPeriod = 30000
const failureThreshold = 5

const newState = () => ({ consecutiveFailures: 0, unavailableUntil: 0 })

const unavailable = (message, statusCode = 503) =>
  new AppError(message, { data: { aiUnavailable: true }, isOperational: true, statusCode })

export const isUnavailableError = (error) => error?.data?.aiUnavailable === true

const recordFailure = (state) => {
  state.consecutiveFailures++

  if (state.consecutiveFailures >= failureThreshold) {
    state.unavailableUntil = Date.now() + cooldownPeriod
    state.consecutiveFailures = 0
  }
}

export const createAiService = () => {
  const serviceStates = { describe: newState(), search: newState() }

  const request = async (path, { body, group = "search", timeout }) => {
    const state = serviceStates[group]

    if (state.unavailableUntil > Date.now()) {
      throw unavailable("AI service temporarily unavailable")
    }

    let response
    let json

    try {
      response = await fetch(`${config.AI_BASE_URL}${path}`, {
        body,
        method: body ? "POST" : "GET",
        signal: AbortSignal.timeout(timeout)
      })

      json = await response.json().catch((error) => {
        if (error.name === "SyntaxError") return null
        throw error
      })
    } catch (error) {
      recordFailure(state)

      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw unavailable("AI service request timed out", 504)
      }
      throw unavailable("AI service connection failed")
    }

    if (response.status >= 500) {
      recordFailure(state)
      throw unavailable("AI service request failed")
    }

    Object.assign(state, newState())

    if (!response.ok || (body && json?.status !== "success")) {
      throw new AppError("AI service rejected the request", {
        data: { response: json },
        isOperational: false
      })
    }

    return body ? json.data : json
  }

  const imageForm = (data) => {
    const form = new FormData()
    form.append("image", new Blob([data]), "image")
    return form
  }

  const embedImage = async (data) => {
    const result = await request("/embed/image", {
      body: imageForm(data),
      timeout: timeouts.embedImage
    })
    return { embedding: result.embedding, model: result.model }
  }

  const embedText = async (text) => {
    const form = new FormData()
    form.append("text", text)

    const result = await request("/embed/text", { body: form, timeout: timeouts.embedText })
    return { embedding: result.embedding, model: result.model }
  }

  const describeImage = async (data) => {
    const result = await request("/describe/image", {
      body: imageForm(data),
      group: "describe",
      timeout: timeouts.describe
    })
    return { model: result.model, text: result.text }
  }

  const translate = async (text, target) => {
    const form = new FormData()
    form.append("text", text)
    form.append("target", target)

    const result = await request("/translate", {
      body: form,
      group: "describe",
      timeout: timeouts.translate
    })
    return { model: result.model, text: result.text }
  }

  const isSearchReady = async () => {
    try {
      const health = await request("/health", { timeout: timeouts.health })
      return health.search?.ready === true && health.search.model === searchConfig.model
    } catch {
      return false
    }
  }

  return { describeImage, embedImage, embedText, isSearchReady, translate }
}

export const aiService = createAiService()
