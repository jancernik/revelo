import type { AxiosResponse } from "axios"

import { AxiosError, AxiosHeaders } from "axios"
import { createPinia, setActivePinia } from "pinia"
import { vi } from "vitest"

import type { ApiFailure, ApiSuccess } from "#src/types/api"
import type { Collection, Image } from "#src/types/models"

export const image = (values: Partial<Image> = {}): Image => ({
  aperture: null,
  camera: null,
  collectionId: null,
  collectionOrder: null,
  comment: null,
  date: null,
  descriptions: {},
  focalLength: null,
  focalLengthEquivalent: null,
  hidden: false,
  id: "image-1",
  iso: null,
  lens: null,
  shutterSpeed: null,
  versions: [],
  ...values
})

export const collectionRow = (id = "collection-1") => ({
  createdAt: "2026-11-13T12:00:00.000Z",
  description: null,
  id,
  title: "Collection",
  updatedAt: "2026-11-13T12:00:00.000Z"
})

export const collection = (id = "collection-1", images: Image[] = []): Collection => ({
  ...collectionRow(id),
  images
})

export const response = <T>(
  data: T,
  headers: AxiosResponse<T>["headers"] = {}
): AxiosResponse<T> => ({
  config: { headers: new AxiosHeaders() },
  data,
  headers,
  status: 200,
  statusText: "OK"
})

export const success = <T>(data: T) => response<ApiSuccess<T>>({ data, status: "success" })

export const failure = (message = "Axios failure", serverMessage?: string) => {
  const data: ApiFailure = { message: serverMessage, status: "error" }
  return new AxiosError(message, undefined, undefined, undefined, response(data))
}

export const deferred = <T>() => {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export const activatePinia = () => {
  const values = new Map<string, string>()
  vi.stubGlobal("localStorage", {
    getItem: (name: string) => values.get(name) ?? null,
    removeItem: (name: string) => {
      values.delete(name)
    },
    setItem: (name: string, value: string) => {
      values.set(name, String(value))
    }
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  return pinia
}
