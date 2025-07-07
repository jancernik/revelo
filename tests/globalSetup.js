import { loadEnvironment } from '../api/config.js'

export default async function globalSetup() {
  await loadEnvironment('test', true)
}
