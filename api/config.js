import "dotenv/config";

const ENV = process.env.NODE_ENV || "development";

const dotenvFiles = {
  development: ".env",
  production: ".env",
  test: ".env.test"
};

const envFile = dotenvFiles[ENV];

if (envFile) {
  const dotenv = await import("dotenv");
  dotenv.config({ path: envFile });
}

const requiredEnvVars = ["PORT", "DB_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "CLIENT_BASE_URL"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

export const config = {
  ENV: ENV,
  PORT: process.env.PORT,
  DB_URL: process.env.DB_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL
};
