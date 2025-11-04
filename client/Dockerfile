FROM node:24-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.13.1

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY client/package.json ./client/

# Install dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

# Accept build arg for commit hash
ARG GIT_COMMIT_HASH

# Copy dependencies and workspace files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy environment and config files
COPY .env* ./
COPY api/src/config/ ./api/src/config/
COPY client/ ./client/

# Set working directory to client for build
WORKDIR /app/client

# Install dependencies for this specific package
RUN pnpm install

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