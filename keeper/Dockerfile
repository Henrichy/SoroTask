# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – deps
#   Install *production-only* dependencies so they can be copied cleanly into
#   the final image without devDependencies or build tooling.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy dependency manifests first to maximise layer caching.
# If neither file changes, Docker skips the npm ci step on rebuilds.
COPY package*.json ./

# Install production deps only — keep the image lean.
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – runner
#   Final, minimal runtime image. Nothing from devDependencies makes it in.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy production node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source.
COPY . .

# Create the data directory and set ownership to the unprivileged 'node' user
# before we switch to that user, so the process can write tasks.json.
RUN mkdir -p /app/data && chown -R node:node /app/data

# Expose the metrics / health-check port (MetricsServer default: 3000).
# Override at runtime with METRICS_PORT env var if needed.
EXPOSE 3000

# SECURITY: run as the unprivileged built-in 'node' user, never root.
USER node

# Start the keeper bot.
CMD ["node", "index.js"]