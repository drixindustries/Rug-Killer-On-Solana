FROM node:20-alpine

# Set up monorepo structure
WORKDIR /workspace

# Copy server package files and install dependencies
COPY server/package*.json ./server/
WORKDIR /workspace/server
RUN npm install --production

# Copy all source code
WORKDIR /workspace
COPY server/ ./server/
COPY shared/ ./shared/

# Set working directory to server
WORKDIR /workspace/server

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx directly
CMD ["node_modules/.bin/tsx", "index.ts"]
