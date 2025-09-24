import {
  createInterface,
  currentEnvFile,
  currentEnvFilePath,
  currentEnvType,
  error,
  generateSecret,
  question,
  success
} from "#src/config/helpers.js"
import fs from "fs"

const envConfig = {
  development: {
    optional: [
      { default: "localhost", description: "SMTP server host", key: "SMTP_HOST" },
      { default: "2525", description: "SMTP server port", key: "SMTP_PORT" },
      { default: "test", description: "SMTP username", key: "SMTP_USER" },
      { default: "test", description: "SMTP password", key: "SMTP_PASS" },
      { default: "dev@localhost", description: "SMTP email address", key: "SMTP_EMAIL" }
    ],
    required: [
      { default: "3000", description: "API server port", key: "API_PORT" },
      { default: "8000", description: "AI service port", key: "AI_PORT" },
      { default: "5173", description: "Client server port", key: "CLIENT_PORT" },
      { default: "http://localhost:8000", description: "AI service URL", key: "AI_BASE_URL" },
      {
        default: "http://localhost:5173",
        description: "Client base URL for emails",
        key: "CLIENT_BASE_URL"
      },
      { default: "uploads", description: "File uploads directory", key: "UPLOADS_DIR" },
      { default: "localhost", description: "Database host", key: "DB_HOST" },
      { default: "5432", description: "Database port", key: "DB_PORT" },
      { default: "revelo_development", description: "Database name", key: "DB_NAME" },
      { default: "postgres", description: "Database username", key: "DB_USER" },
      {
        autoGenerate: true,
        description: "Database password",
        key: "DB_PASSWORD",
        length: 20
      },
      {
        autoGenerate: true,
        description: "JWT secret for authentication",
        key: "JWT_SECRET",
        length: 32
      },
      {
        autoGenerate: true,
        description: "JWT refresh secret",
        key: "JWT_REFRESH_SECRET",
        length: 32
      }
    ]
  },
  production: {
    optional: [
      { description: "API server port", key: "API_PORT" },
      { description: "AI service port", key: "AI_PORT" },
      { description: "Client server port", key: "NGINX_PORT" },
      { description: "File uploads directory", key: "UPLOADS_DIR" },
      { description: "Database name", key: "DB_NAME" },
      { description: "Database username", key: "DB_USER" }
    ],
    required: [
      { description: "Client base URL", key: "CLIENT_BASE_URL" },
      { description: "SMTP server host", key: "SMTP_HOST" },
      { default: 587, description: "SMTP server port", key: "SMTP_PORT" },
      { description: "SMTP username", key: "SMTP_USER" },
      { description: "SMTP password", key: "SMTP_PASS" },
      { description: "SMTP email address", key: "SMTP_EMAIL" },
      {
        autoGenerate: true,
        description: "Database password",
        key: "DB_PASSWORD",
        length: 20
      },
      {
        autoGenerate: true,
        description: "JWT secret for authentication",
        key: "JWT_SECRET",
        length: 32
      },
      {
        autoGenerate: true,
        description: "JWT refresh secret",
        key: "JWT_REFRESH_SECRET",
        length: 32
      }
    ]
  },
  test: {
    required: [
      { default: "3001", description: "API server port", key: "API_PORT" },
      { default: "5173", description: "Client server port", key: "CLIENT_PORT" },
      { default: "test-uploads", description: "File uploads directory", key: "UPLOADS_DIR" },
      { default: "localhost", description: "Database host", key: "DB_HOST" },
      { default: "5432", description: "Database port", key: "DB_PORT" },
      { default: "revelo_test", description: "Database name", key: "DB_NAME" },
      { default: "postgres", description: "Database username", key: "DB_USER" },
      {
        default: "test_db_password",
        description: "Database password",
        key: "DB_PASSWORD"
      },
      {
        default: "test_jwt_secret",
        description: "JWT secret for authentication",
        key: "JWT_SECRET"
      },
      {
        default: "test_jwt_refresh_secret",
        description: "JWT refresh secret",
        key: "JWT_REFRESH_SECRET"
      }
    ]
  }
}

async function setupEnvironment(override) {
  const envType = currentEnvType(override)
  const envFileName = currentEnvFile(override)
  const filePath = currentEnvFilePath(override)

  const config = envConfig[envType]
  if (!config) error(`Unknown environment: ${envType}`)

  if (fs.existsSync(filePath)) {
    success(`Environment file for '${envType}' exists: ${envFileName}`)
    return
  }

  const rl = createInterface()
  const envVars = {}

  console.log(`Setting up environment file for '${envType}': ${envFileName}`)
  console.log("Press Enter to use defaults or auto-generate values where applicable")

  try {
    if (config.required?.length > 0) {
      console.log("\nRequired Variables:\n")
      for (const variable of config.required) {
        let prompt = `${variable.key} - ${variable.description}`

        if (variable.autoGenerate) prompt += ` [Leave empty to auto-generate]`
        else if (variable.default) prompt += ` [${variable.default}]`
        else prompt += ` []`

        prompt += ": "

        const value = await question(rl, prompt)

        if (!value.trim()) {
          if (variable.autoGenerate) {
            envVars[variable.key] = generateSecret(variable.length || 32)
          } else if (variable.default) {
            envVars[variable.key] = variable.default
          } else {
            error(`${variable.key} cannot be empty`)
          }
        } else {
          envVars[variable.key] = value.trim()
        }
      }
    }

    if (config.optional?.length > 0) {
      console.log("\nOptional Variables:\n")
      for (const variable of config.optional) {
        const defaultText = variable.default ? `[${variable.default}]` : "[]"
        const prompt = `${variable.key} - ${variable.description} ${defaultText}: `
        const value = await question(rl, prompt)

        if (value.trim()) {
          envVars[variable.key] = value.trim()
        } else if (variable.default) {
          envVars[variable.key] = variable.default
        }
      }
    }

    let content = `# Generated on ${new Date().toISOString()}\n\n`
    if (config.required?.length > 0) {
      content += "# Required Variables\n"
      content += `NODE_ENV=${envType}\n`
      for (const variable of config.required) {
        if (envVars[variable.key]) {
          content += `${variable.key}=${envVars[variable.key]}\n`
        }
      }
      content += "\n"
    }

    const optionalVars = config.optional?.filter((v) => envVars[v.key])

    if (optionalVars?.length > 0) {
      content += "# Optional Variables\n"
      for (const variable of optionalVars) {
        content += `${variable.key}=${envVars[variable.key]}\n`
      }
      content += "\n"
    }

    fs.writeFileSync(filePath, content)
    console.log()
    success(`Created Environment file for '${envType}': ${envFileName}`)
  } finally {
    rl.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envType = process.argv[2] || process.env.NODE_ENV || "development"
  setupEnvironment(envType)
}
