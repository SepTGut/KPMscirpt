# ============================================
# Stage 1: Build Vue 3 Frontend
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source and compile production bundle
COPY . .
RUN npm run build

# ============================================
# Stage 2: Minimal Production Server (~100MB)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled static assets and server
COPY --from=builder /app/dist ./dist
COPY server.mjs ./

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.mjs"]
