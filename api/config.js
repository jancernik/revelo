import "dotenv/config";

const ENV = process.env.NODE_ENV || "development";

const loadEnvironment = async () => {
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
};

loadEnvironment();

const requiredEnvVars = [
  "PORT",
  "DB_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CLIENT_BASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "FROM_EMAIL"
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

export const config = {
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL,
  DB_URL: process.env.DB_URL,
  ENV: ENV,
  FROM_EMAIL: process.env.FROM_EMAIL,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER
};
