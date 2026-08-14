FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
# better-sqlite3 has no musl prebuilds; node-gyp needs a toolchain on alpine
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The base path inlines into the client bundle at build time. The default
# is the monolith deployment under /showcase on the marketplace domain;
# build with --build-arg NEXT_PUBLIC_BASE_PATH= for a root deployment.
ARG NEXT_PUBLIC_BASE_PATH=/showcase
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
# Better Auth refuses to initialise without a secret, and page data is
# collected during the build. This value is never used at runtime: the
# running container reads BETTER_AUTH_SECRET from its own environment.
ENV BETTER_AUTH_SECRET=build-time-placeholder
ENV SQLITE_PATH=/tmp/build.db
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The SQLite database lives on a mounted volume at /data
RUN mkdir /data && chown nextjs:nodejs /data /app

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV SQLITE_PATH=/data/app.db

CMD ["node", "server.js"]
