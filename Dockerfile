# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the SvelteKit application (dummy DATABASE_URL prevents build-time prerender checks from failing)
ENV DATABASE_URL=postgresql://build_dummy:build_dummy@127.0.0.1:5432/dummy
RUN npm run build

# Remove devDependencies to keep the image small
RUN npm prune --production

# Stage 2: Production Server
FROM node:22-alpine

WORKDIR /app

# Copy production dependencies and build artifacts from the builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Ensure uploads directory exists
RUN mkdir -p /app/uploads

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the Node.js server
CMD ["node", "build/index.js"]
