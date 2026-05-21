FROM node:24-alpine AS base

# Install pnpm
RUN npm install -g pnpm@11.2.2

# Set working directory
WORKDIR /app/client

# Copy client files
COPY client/package.json ./package.json
COPY client/ ./

# Install dependencies
RUN pnpm install

# Build stage
FROM base AS builder

# Accept build arg for commit hash
ARG GIT_COMMIT_HASH

# Copy environment and config files needed at build time
COPY .env* ../
COPY api/src/config/ ../api/src/config/

# Build the application with commit hash
ENV VITE_COMMIT_HASH=${GIT_COMMIT_HASH}
RUN pnpm build

FROM nginx:alpine AS runner

# Create non-root user
RUN addgroup --system --gid 1001 nginx-user && adduser --system --uid 1001 nginx-user

# Copy built assets
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Change ownership of static files and cache directories
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html && \
  mkdir -p /var/cache/nginx && chown -R nginx-user:nginx-user /var/cache/nginx && \
  mkdir -p /var/log/nginx && chown -R nginx-user:nginx-user /var/log/nginx

# Expose port
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]