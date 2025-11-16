FROM node:20-alpine

# Create workspace structure
WORKDIR /workspace

# Copy shared first
COPY shared/ ./shared/

# Copy server package files
COPY server/package*.json ./server/
WORKDIR /workspace/server

# Install dependencies
RUN npm install --production

# Copy server source
WORKDIR /workspace
COPY server/ ./server/

# Set final working directory
WORKDIR /workspace/server

# Environment
ENV NODE_ENV=production
ENV TSX_TSCONFIG_PATH=/workspace/server/tsconfig.json
EXPOSE 5000

# Run tsx with proper node options
CMD ["node", "--import", "tsx", "index.ts"]
