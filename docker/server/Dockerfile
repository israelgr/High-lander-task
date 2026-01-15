# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY server ./server

# Build server
WORKDIR /app/server
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files and shared types
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared ./shared

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "dist/server.js"]
