FROM node:24-alpine AS deps

# Install pnpm
RUN npm install -g pnpm@11.2.2

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY api/ ./api/
RUN pnpm deploy --frozen-lockfile --config.inject-workspace-packages=true --filter api /deploy

FROM node:24-alpine AS base

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy the deployed API with its dependencies
COPY --from=deps /deploy ./

# Create uploads directory with subdirectories and proper permissions
RUN mkdir -p uploads/staging uploads/images && chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD sh -c 'curl -f http://localhost:${API_PORT:-3000}/health || exit 1'

# Start the application nd ensure uploads permissions
CMD ["sh", "-c", "mkdir -p uploads/staging uploads/images && node server.js"]