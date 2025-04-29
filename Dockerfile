# Use Node.js LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ curl

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Build the client application
WORKDIR /app/client
RUN npm ci
RUN npm run build

# Return to the main directory
WORKDIR /app

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["node", "server.js"]