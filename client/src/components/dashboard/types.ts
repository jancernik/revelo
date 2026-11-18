import type { Image } from "#src/types/models"

export type GridImage = Image | UploadPreview

export interface UploadPreview {
  id: string
  name: string
  path: string
  size: number
}
