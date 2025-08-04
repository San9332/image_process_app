# Use official Node.js image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy only package.json and package-lock.json to install deps first
COPY package*.json ./

# Install backend dependencies
RUN npm install --legacy-peer-deps


# Copy everything else (src/, prisma/, etc.)
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose HTTP (Fastify) and WebSocket ports
EXPOSE 3001 3002

# Run your server file with tsx
CMD ["npx", "tsx", "src/server.ts"]
