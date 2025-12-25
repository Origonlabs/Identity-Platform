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
