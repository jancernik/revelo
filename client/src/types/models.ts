export interface AuthPayload {
  accessToken: string
  user: User
}

export interface BackfillTaskResult {
  errors: number
  scanned: number
  successful: number
}

export interface CleanupTaskResult {
  deleted: number
  errors: number
  scanned: number
}

export interface Collection {
  createdAt: string
  description: null | string
  id: string
  images: Image[]
  title: null | string
  updatedAt: string
}

export type CompleteSetting =
  | SettingDefinition<"decimal", number>
  | SettingDefinition<"integer", number>
  | (SettingDefinition<"multiselect", SettingValue[]> & { options?: SettingValue[] })
  | (SettingDefinition<"select", SettingValue> & { options?: SettingValue[] })
  | (SettingDefinition<"switch", SettingValue> & { options?: SettingValue[] })
  | SettingDefinition<"text", string>
  | SettingDefinition<"textpairs", TextPairs>
  | SettingDefinition<"toggle", boolean>

/** How a description came to be. Edited texts are never overwritten by the server. */
export type DescriptionSource = "edited" | "generated" | "translated"

export interface Image {
  aperture: null | string
  camera: null | string
  collectionId: null | string
  collectionOrder: null | number
  comment: null | string
  date: null | string
  descriptions: ImageDescriptions
  focalLength: null | string
  focalLengthEquivalent: null | string
  hidden: boolean
  id: string
  iso: null | number
  lens: null | string
  shutterSpeed: null | string
  versions: ImageVersion[]
}

/** One language of an image in the description editor. Every configured language is listed. */
export type ImageDescription = PendingDescription | WrittenDescription

/** Description texts by language code. Languages without a text are absent. */
export type ImageDescriptions = Record<string, string>

export interface ImageMetadataForm {
  aperture: string
  camera: string
  comment: string
  date: null | string
  focalLength: string
  focalLengthEquivalent: string
  iso: string
  lens: string
  shutterSpeed: string
}

export interface ImageVersion {
  height: number
  path: string
  size: number
  storageType: "local" | "s3"
  type: ImageVersionType
  width: number
}

export type ImageVersionType = "original" | "regular" | "thumbnail" | "tiny"

export interface KnownSettings {
  aboutDialogDescription: string
  aboutDialogTitle: string
  capFrameRate: boolean
  enableSignups: boolean
  maxAdmins: number
  maxUploadFiles: number
  maxUploadSize: number
  nativeScroll: boolean
  replaceCameraNames: TextPairs
  replaceLensNames: TextPairs
  showAboutDialog: boolean
  showLoginLink: boolean
}

export interface PublicSetting {
  name: string
  value: SettingValue
}

export type SettingType =
  "decimal" | "integer" | "multiselect" | "select" | "switch" | "text" | "textpairs" | "toggle"

export type SettingValue =
  boolean | null | number | SettingValue[] | string | { [key: string]: SettingValue }

export type TextPairs = [string, string][]

export interface UploadedImage extends Image {
  createdAt: string
  originalFilename: string
  updatedAt: string
}

export interface UploadReview {
  filePath: string
  metadata: Partial<Omit<ImageMetadataForm, "comment" | "date">> & { date?: string }
  sessionId: string
}

export interface User {
  admin: boolean
  email: string
  emailVerified: boolean
  id: number
  username: string
}

/** A description the server has yet to generate. */
interface PendingDescription {
  language: string
  source: null
  text: null
  updatedAt: null
}

interface SettingDefinition<
  Type extends SettingType,
  Value extends SettingValue
> extends PublicSetting {
  category: string
  default: Value
  description: string
  type: Type
  value: Value
}

interface WrittenDescription {
  language: string
  source: DescriptionSource
  text: string
  updatedAt: string
}
