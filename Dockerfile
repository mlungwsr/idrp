# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies including AWS CLI for IAM authentication
RUN apk add --no-cache python3 make g++ curl aws-cli

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (including dev dependencies)
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the React client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
RUN npm run build

# Return to the main directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Expose the port the app runs on
EXPOSE 5001

# Create a non-root user and switch to it
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser
USER nodeuser

# Start the application
CMD ["node", "server.js"]
