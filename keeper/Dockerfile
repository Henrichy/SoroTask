# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps
#   Install production-only dependencies for cache-efficient builds.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package manifests first for better layer caching.
COPY package*.json ./

# Install production dependencies only.
RUN npm ci --omit=dev && npm cache clean --force

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – final runtime
#   Minimal runtime image with production assets only.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy prod dependencies from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application files (excluding ignored files in .dockerignore).
COPY . .

# Create runtime data directory and set safe permissions.
RUN mkdir -p /app/data && chown -R node:node /app/data

# Expose the default metrics/health port.
EXPOSE 3000

# SECURITY: run as the unprivileged node user.
USER node

CMD ["node", "index.js"]