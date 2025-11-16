FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy shared directory and server source
COPY shared/ ./shared/
COPY server/ ./

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx
CMD ["node_modules/.bin/tsx", "index.ts"]
