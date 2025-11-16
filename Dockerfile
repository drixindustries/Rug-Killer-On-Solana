FROM node:20-alpine

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server source code
COPY server/ ./

# Copy shared INTO parent directory so ../shared works
# This creates /shared (parent of /app)
RUN mkdir -p ../shared
COPY shared/ ../shared/

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx
CMD ["node_modules/.bin/tsx", "index.ts"]
