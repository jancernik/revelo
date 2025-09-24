FROM node:24-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy only API files
COPY api/package.json ./package.json
COPY api/ ./

# Install dependencies directly in the API directory
RUN pnpm install

# Create uploads directory with subdirectories and proper permissions
RUN mkdir -p uploads/staging uploads/images && chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE ${API_PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${API_PORT:-3000}/health || exit 1

# Start the application with migrations and ensure uploads permissions
CMD ["sh", "-c", "mkdir -p uploads/staging uploads/images && pnpm db:migrate && node server.js"]