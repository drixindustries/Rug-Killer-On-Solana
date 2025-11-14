FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build the project (expects a root-level build script creating dist/)
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output and any runtime assets required by the server
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/public ./client/public
COPY --from=build /app/shared ./shared

ENV NODE_ENV=production
EXPOSE 5000

# Start the compiled server entry
CMD ["node", "dist/index.js"]
