# Stage 1: Builder
# This stage installs all dependencies, including devDependencies, to build the project.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the TypeScript project
RUN npm run build

# Remove development dependencies
RUN npm prune --production


# Stage 2: Production
# This stage creates the final, lean image with only the built code and production dependencies.
FROM node:22-alpine

WORKDIR /app

# Copy production dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json
COPY package.json .

# Expose the port the API will run on
EXPOSE 6543

# The default command will be to start the API server.
# This can be overridden when running the container.
CMD ["npm", "start"] 