FROM node:20-alpine AS base

# Install pnpm directly without corepack
RUN npm install -g pnpm@8.15.5

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml muralla-common-1.0.0.tgz ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Install build-time tools
RUN pnpm add -D prisma typescript

# Generate Prisma client
RUN pnpm exec prisma generate

# Build the application
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

# Install pnpm directly without corepack
RUN npm install -g pnpm@8.15.5

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nestjs:nodejs package.json pnpm-lock.yaml muralla-common-1.0.0.tgz ./

# Install production dependencies and prisma
RUN pnpm install --prod && pnpm add prisma @prisma/client && npm pkg delete scripts.prepare || true

# Copy built application and prisma schema
COPY --from=base --chown=nestjs:nodejs /app/dist ./dist
COPY --from=base --chown=nestjs:nodejs /app/prisma ./prisma

# Generate Prisma client in production stage
RUN pnpm exec prisma generate

# Copy any additional generated files from build stage
COPY --from=base --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/main.js"]
