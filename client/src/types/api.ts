export type ApiFailure =
  | {
      data: ApiFailureData | null
      message?: string
      status: "fail"
    }
  | {
      data?: ApiFailureData
      message?: string
      status: "error"
    }

export interface ApiSuccess<T> {
  data: T
  status: "success"
}

interface ApiFailureData {
  [key: string]: unknown
  validation?: { message: string }[]
}
