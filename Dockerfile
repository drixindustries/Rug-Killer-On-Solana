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

# Install only the server runtime dependencies
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy shared directory and server source (node_modules retained from npm ci)
WORKDIR /app
RUN ln -s /app/server/node_modules /app/node_modules
COPY shared/ ./shared/
COPY server/ ./server/

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/dist/public ./server/dist/public

# Verify copy worked
RUN ls -la ./server/dist/public/ && test -f ./server/dist/public/index.html && echo "✅ Frontend copied successfully" || (echo "❌ Frontend copy failed!" && exit 1)

# Environment
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Run from server directory using local tsx
WORKDIR /app/server
CMD ["./node_modules/.bin/tsx", "index.ts"]
