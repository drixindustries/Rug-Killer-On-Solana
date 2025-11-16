FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
RUN npm install

# Copy necessary files for build
COPY client/ ./client/
COPY shared/ ./shared/
COPY vite.config.ts ./
COPY tsconfig*.json ./

# Build ONLY frontend (not server)
RUN npx vite build --config vite.config.ts

# Verify build output
RUN ls -la /app/dist/public/ || echo "Build directory not found!"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy shared directory and server source
COPY shared/ ./shared/
COPY server/ ./

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/dist/public ./dist/public

# Verify copy worked
RUN ls -la ./dist/public/ || echo "Frontend not copied!"
RUN test -f ./dist/public/index.html && echo " index.html found" || echo " index.html missing"

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx
CMD ["node_modules/.bin/tsx", "index.ts"]
