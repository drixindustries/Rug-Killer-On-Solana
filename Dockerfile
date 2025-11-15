FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build client (outputs to dist/public) and server (outputs to dist/)
RUN npm run build

# Production stage
FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Start server
CMD ["node", "dist/index.js"]
