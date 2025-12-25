# syntax=docker/dockerfile:1.7
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# Install workspace dependencies for this service only
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/oauth-connections-service/package.json apps/oauth-connections-service/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/event-bus/package.json packages/event-bus/package.json
COPY packages/observability/package.json packages/observability/package.json
COPY configs ./configs
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --filter @opendex/contracts... --filter @opendex/event-bus... --filter @opendex/observability... --filter @opendex/oauth-connections-service...

# Build dependencies + service
COPY packages/contracts ./packages/contracts
COPY packages/event-bus ./packages/event-bus
COPY packages/observability ./packages/observability
COPY apps/oauth-connections-service ./apps/oauth-connections-service
RUN pnpm --filter @opendex/contracts build
RUN pnpm --filter @opendex/event-bus build
RUN pnpm --filter @opendex/observability build
RUN pnpm --filter @opendex/oauth-connections-service build

# Prune to production footprint for runtime
RUN pnpm --filter @opendex/oauth-connections-service deploy --prod /app

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=base /app ./
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8202
CMD ["node", "dist/main.js"]
