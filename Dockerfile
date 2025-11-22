FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy root package files and install ALL dependencies (including devDependencies for vite)
COPY package*.json ./
RUN npm ci

# Copy necessary files for build
COPY client/ ./client/
COPY shared/ ./shared/
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.ts ./
COPY components.json ./

# Build ONLY frontend (not server)
RUN npx vite build --config vite.config.ts

# Verify build output exists
RUN ls -la /app/dist/public/ && echo "✅ Frontend build successful" || (echo "❌ Frontend build failed!" && exit 1)

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy shared directory first (needed by both root and server)
COPY shared/ ./shared/

# Copy root package files and install ALL dependencies (shared needs them)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server package files and install production dependencies
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

WORKDIR /app
# Copy server source
COPY server/ ./server/

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/dist/public ./server/dist/public

# Verify copy worked
RUN ls -la ./server/dist/public/ && test -f ./server/dist/public/index.html && echo "✅ Frontend copied successfully" || (echo "❌ Frontend copy failed!" && exit 1)

# Environment
ENV NODE_ENV=production
ENV PORT=8080
ENV NODE_PATH=/app/server/node_modules
EXPOSE 8080

# Run tsx from server directory
WORKDIR /app/server
CMD ["sh", "-c", "cd /app/server && node_modules/.bin/tsx index.ts"]
