FROM node:20-alpine

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy source code
COPY server/ ./
COPY shared/ ./shared/

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx directly - bypass npm
CMD ["node_modules/.bin/tsx", "index.ts"]
