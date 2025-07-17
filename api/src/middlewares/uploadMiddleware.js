import { ValidationError } from "#src/core/errors.js"
import Setting from "#src/models/Setting.js"
import multer from "multer"

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads")
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${file.originalname.split(".").pop()}`
    cb(null, uniqueName)
  }
})

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return cb(new ValidationError("Only images are allowed"), false)
  }
  cb(null, true)
}

const validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    throw new ValidationError("No files uploaded")
  }
  next()
}

export const createImageUpload = async (req, res, next) => {
  try {
    const maxUploadSize = await Setting.get("maxUploadSize", { includeRestricted: true })
    const maxUploadFiles = await Setting.get("maxUploadFiles", { includeRestricted: true })

    const upload = multer({
      fileFilter,
      limits: { fileSize: maxUploadSize.value * 1024 * 1024 },
      storage
    }).array("images", maxUploadFiles.value)

    upload(req, res, (err) => {
      if (err) {
        return next(err)
      }
      req.files = req.files || []
      next()
    })
  } catch (error) {
    next(error)
  }
}

export const uploadImages = [createImageUpload, validateFiles]
