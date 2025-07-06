import path from 'path'
import { fileURLToPath } from 'url'
import { createApi } from '../api/createApi.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createTestApi() {
  const testUploadsDir = path.join(__dirname, '../test-uploads')

  return createApi({
    enableLogging: false,
    uploadsDir: testUploadsDir
  })
}
