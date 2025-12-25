# CLAUDE KNOWLEDGE

Q: What is the high-level layout of the Atlas Identity Platform repo?
A: It is a Turbo monorepo with apps for backend (Next.js API at apps/backend), dashboard (apps/dashboard), dev launchpad (apps/dev-launchpad), and e2e tests. Shared code lives in packages such as stack (Next.js SDK), stack-shared (utilities and types), stack-ui (UI components), react (React SDK), and js (JavaScript SDK). Development uses pnpm with commands like `pnpm install`, `pnpm test run`, `pnpm lint`, `pnpm typecheck`, and `pnpm build:packages`, plus Dockerized dependencies via `pnpm restart-deps`.

Q: Is there already a standalone auth microservice in the repo?
A: Yes. There is an existing Nest-based auth microservice under apps/auth-service with its own Prisma folder and configs, separate from the main Next.js backend in apps/backend.

Q: Where do the new shared API/event contracts live for microservices?
A: In packages/contracts, a new package exporting versioned event envelopes plus contracts for notifications and OAuth connections (events, DTOs, token sets). It is built with tsup-node and TypeScript 5.3 settings similar to other packages.

Q: Is there already a notifications microservice scaffold?
A: Yes. apps/notifications-service is a NestJS service with health check, DTO validation, and controllers to enqueue/list notifications using @opendex/contracts types. It currently stores requests in-memory (Map) as a scaffold and is ready to be wired to persistence/outbox and a message bus.

Q: Is there an OAuth connections microservice scaffold?
A: Yes. apps/oauth-connections-service is a NestJS service with health check, DTOs for linking connections, controller to link/list, and in-memory storage using @opendex/contracts (OAuthConnection, TokenSet, events). It is scaffolded to later add persistence and event bus publishing.

Q: Do the new microservices use Prisma yet?
A: Yes. notifications-service and oauth-connections-service now have Prisma schemas (apps/*/prisma/schema.prisma), PrismaService providers, and repositories backed by Postgres instead of in-memory Maps. Each has an OutboxEvent table for future event bus integration. package.json scripts include prisma:generate and prisma:migrate.

Q: How are the new microservices containerized?
A: Each has a dedicated Dockerfile (apps/notifications-service/Dockerfile, apps/oauth-connections-service/Dockerfile) using Node 20 slim, pnpm workspaces, builds @opendex/contracts + the service, prunes with `pnpm deploy --prod`, runs as non-root `appuser`, and exposes ports 8201/8202 respectively.

Q: Is there a dev docker-compose to run the new microservices with isolated DBs?
A: Yes. docker/services/docker.compose.yaml builds and runs notifications-service and oauth-connections-service with their own Postgres instances (ports 5434/5435) and exposes services on 8201/8202. docker/services/README.md documents the command.

Q: How does the backend gateway talk to the new microservices?
A: apps/backend now has a microservice client helper in apps/backend/src/lib/microservices.tsx using NOTIFICATIONS_SERVICE_URL and OAUTH_CONNECTIONS_SERVICE_URL, plus new proxy routes at apps/backend/src/app/api/latest/notifications/route.tsx and apps/backend/src/app/api/latest/oauth-connections/route.tsx.

Q: Are there E2E tests for the new microservice proxy endpoints?
A: Yes. apps/e2e/tests/backend/endpoints/api/v1/notifications.test.ts and apps/e2e/tests/backend/endpoints/api/v1/oauth-connections.test.ts cover POST/GET proxy behavior, with conditional skips when the microservice URLs are not set.

Q: How is service-to-service auth enforced between the backend and microservices?
A: The backend includes an internal token in requests (INTERNAL_SERVICE_TOKEN) via apps/backend/src/lib/microservices.tsx. Both notifications-service and oauth-connections-service enforce x-internal-service-token using InternalServiceGuard, requiring INTERNAL_SERVICE_TOKEN in their env validation.

Q: Is there a stronger internal auth option than a static token?
A: Yes. The backend can sign short-lived JWTs using INTERNAL_SERVICE_JWT_SECRET or INTERNAL_SERVICE_JWT_SECRETS (kid:secret list) in apps/backend/src/lib/microservices.tsx. Microservices validate JWTs with jose (checking kid/audience/issuer) and still accept a legacy static token as a fallback.

Q: Can internal calls use mTLS?
A: The backend supports optional mTLS dispatchers: set INTERNAL_MTLS_CA_FILE / INTERNAL_MTLS_CERT_FILE / INTERNAL_MTLS_KEY_FILE (and INTERNAL_MTLS_REJECT_UNAUTHORIZED) to create an undici dispatcher with TLS options. Compose/dev envs show example toggles.

Q: Is there an endpoint to inspect internal security config?
A: Yes. apps/backend/src/app/api/latest/internal/security/route.tsx returns presence of internal auth (static token/JWT secrets) and mTLS config flags. Requires server-level auth.
