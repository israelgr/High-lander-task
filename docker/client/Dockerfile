# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Copy workspace packages
COPY shared/package*.json ./shared/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY client ./client

# Build client
WORKDIR /app/client

ARG VITE_API_URL
ARG VITE_SOCKET_URL

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

RUN npm run build

# Production stage - Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy nginx config
COPY docker/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
