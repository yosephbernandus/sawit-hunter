FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install

# Copy application files
COPY . .

# Build the game bundle
RUN bun run build

# Expose port
EXPOSE 3000

# Start the server
CMD ["bun", "server.ts"]
