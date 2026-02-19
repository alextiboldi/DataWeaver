FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

# ------- Dependencies -------
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile

# ------- Build -------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL for Prisma generate & Next.js build (not used at runtime)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN pnpm prisma generate
RUN pnpm build

# Install prisma CLI + dotenv into a separate directory with npm (flat node_modules)
RUN mkdir /prisma-cli && cd /prisma-cli && npm init -y && npm install prisma@7.4.0 dotenv@17

# ------- Production -------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema, migrations, generated client, and config
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/generated ./generated

# Copy prisma CLI with all its deps (installed via npm for flat node_modules)
COPY --from=builder /prisma-cli/node_modules /prisma-cli/node_modules

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
