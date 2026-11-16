export const descriptionConfig = {
  maxLength: 500,
  sourceLanguage: "en",
  targetLanguages: ["es"]
}

export const descriptionLanguages = [
  descriptionConfig.sourceLanguage,
  ...descriptionConfig.targetLanguages
]
