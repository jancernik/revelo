import { searchConfig } from "#src/config/search.js"
import Image from "#src/models/Image.js"
import { aiService } from "#src/services/aiService.js"

export const selectRelevant = (scored, { floor, margin }) => {
  if (scored.length === 0) return []

  const threshold = Math.max(scored[0].similarity - margin, floor)
  return scored.filter((row) => row.similarity >= threshold)
}

const embedQuery = async (text) => {
  try {
    const { embedding, model } = await aiService.embedText(text)
    if (model !== searchConfig.model) {
      console.error(
        `Search expects embeddings from ${searchConfig.model}, AI service uses ${model}`
      )
      return null
    }
    return embedding
  } catch (error) {
    console.error(`Search query embedding failed: ${error.message}`)
    return null
  }
}

export const search = async (text, options = {}) => {
  const { includeHidden = false, limit = 50 } = options

  const [embedding, metadataIds] = await Promise.all([
    embedQuery(text),
    text.length >= searchConfig.minMetadataQueryLength
      ? Image.findIdsByMetadata(text, { includeHidden })
      : []
  ])

  const scored = embedding
    ? await Image.scoreBySimilarity(embedding, { includeHidden, model: searchConfig.model })
    : []
  const similarity = new Map(scored.map((row) => [row.id, row.similarity]))

  const metadataMatches = [...metadataIds].sort(
    (a, b) => (similarity.get(b) ?? -Infinity) - (similarity.get(a) ?? -Infinity)
  )
  const semanticMatches = selectRelevant(scored, searchConfig).map((row) => row.id)
  const ids = [...new Set([...metadataMatches, ...semanticMatches])].slice(0, limit)

  return { images: await Image.findByIdsWithVersions(ids), semantic: embedding !== null }
}
