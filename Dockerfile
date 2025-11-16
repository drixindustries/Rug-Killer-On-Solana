FROM node:20-alpine

# Copy shared to root first, before setting WORKDIR
COPY shared/ /shared/

# Now set up the app directory
WORKDIR /app

# Copy server package files and install dependencies  
COPY server/package*.json ./
RUN npm install --production

# Copy server source code
COPY server/ ./

# Environment
ENV NODE_ENV=production
EXPOSE 5000

# Run tsx
CMD ["node_modules/.bin/tsx", "index.ts"]
