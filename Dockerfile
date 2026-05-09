# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching of layers
COPY package*.json ./

# Install ALL dependencies (including devDependencies like typescript)
RUN npm install

# Copy the rest of the source code
COPY . .

# Run the build script (tsc) to generate the dist folder
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Copy only the package files
COPY package*.json ./

# Install only production dependencies (this keeps the image small)
RUN npm install --omit=dev

# Copy the compiled code from the builder stage
COPY --from=builder /app/dist ./dist

# Set the environment to production
ENV NODE_ENV=production

# The port Cloud Run expects
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
