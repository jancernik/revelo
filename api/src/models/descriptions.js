export const QUERY_API_DESCRIPTION_COLUMNS = { language: true, text: true }

export const withDescriptionMap = (image) => {
  if (!Array.isArray(image.descriptions)) return { ...image, descriptions: {} }

  return {
    ...image,
    descriptions: Object.fromEntries(image.descriptions.map((row) => [row.language, row.text]))
  }
}
