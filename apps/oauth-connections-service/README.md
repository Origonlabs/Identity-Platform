# OAuth Connections Service

Microservice for managing OAuth 2.0 and OpenID Connect provider connections, handling token storage, refresh, and lifecycle management for the Atlas Identity Platform.

## Features

### Core Capabilities
- 🔗 **Connection Management**: Store and manage OAuth connections per user/tenant
- 🔄 **Token Lifecycle**: Automatic token expiration tracking and refresh coordination
- 📊 **Multi-Provider Support**: Support for any OAuth 2.0/OIDC provider
- 🔐 **Secure Storage**: Encrypted token storage with Prisma ORM
- ⚡ **Event-Driven**: Transactional outbox pattern for reliable event publishing
- 📈 **Observability**: Built-in metrics, tracing, and logging

### Connection States
- **active**: Connection is valid and tokens are current
- **refreshing**: Token refresh is in progress
- **expired**: Tokens have expired and need refresh
- **revoked**: User or system has revoked the connection

## Architecture

This service follows clean architecture principles with clear separation of concerns:

```
src/
├── modules/
│   ├── connections/           # Core connection management
│   │   ├── connections.controller.ts
│   │   ├── connections.service.ts
│   │   ├── token-refresh.worker.ts
│   │   └── dto/
│   ├── health/               # Health checks
│   ├── metrics/              # Prometheus metrics
│   ├── outbox/               # Event outbox processor
│   └── auth/                 # Internal service authentication
└── prisma/
    └── prisma.service.ts
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- pnpm 9+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/oauth_connections"

# Server
PORT=8202
NODE_ENV=development

# Internal Service Authentication (choose one)
INTERNAL_SERVICE_TOKEN=your-secure-token-here
# OR
INTERNAL_SERVICE_JWT_SECRET=your-jwt-secret-here

# Event Bus (optional)
NATS_URL=nats://localhost:4222

# Observability (optional)
ENABLE_TRACING=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
ENABLE_METRICS=true
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
```

### Development

```bash
# Start in development mode
pnpm start:dev

# Run tests
pnpm test

# Open Prisma Studio
pnpm prisma:studio
```

### Production

```bash
# Build
pnpm build

# Start production server
pnpm start:prod
```

## API Reference

### Authentication

All endpoints require internal service authentication via:
- Header: `X-Internal-Service-Token: <token>`
- OR Header: `Authorization: Bearer <jwt>`

### Endpoints

#### Link OAuth Connection

```http
POST /v1/connections
Content-Type: application/json

{
  "providerId": "google",
  "projectId": "proj_123",
  "tenantId": "tenant_123",
  "userId": "user_123",
  "scope": ["openid", "profile", "email"],
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBx...",
    "refreshToken": "1//0gOHxSbqv...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T11:30:00Z",
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response 201 Created**
```json
{
  "id": "conn_clxxx",
  "providerId": "google",
  "projectId": "proj_123",
  "tenantId": "tenant_123",
  "userId": "user_123",
  "scope": ["openid", "profile", "email"],
  "status": "active",
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBx...",
    "refreshToken": "1//0gOHxSbqv...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T11:30:00Z",
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }
}
```

#### List Connections

```http
GET /v1/connections
```

**Response 200 OK**
```json
[
  {
    "id": "conn_clxxx",
    "providerId": "google",
    "projectId": "proj_123",
    "userId": "user_123",
    "status": "active",
    "...": "..."
  }
]
```

#### Get Connection by ID

```http
GET /v1/connections/:id
```

**Response 200 OK**
```json
{
  "id": "conn_clxxx",
  "providerId": "google",
  "status": "active",
  "tokenSet": { "...": "..." }
}
```

#### Update Connection Tokens

```http
PUT /v1/connections/:id/tokens
Content-Type: application/json

{
  "accessToken": "ya29.new_token...",
  "refreshToken": "1//new_refresh...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "issuedAt": "2024-01-15T11:30:00Z",
  "expiresAt": "2024-01-15T12:30:00Z"
}
```

**Response 200 OK**
```json
{
  "id": "conn_clxxx",
  "status": "active",
  "tokenSet": {
    "accessToken": "ya29.new_token...",
    "...": "..."
  }
}
```

#### Revoke Connection

```http
POST /v1/connections/:id/revoke
```

**Response 200 OK**
```json
{
  "id": "conn_clxxx",
  "status": "revoked",
  "...": "..."
}
```

#### Delete Connection

```http
DELETE /v1/connections/:id
```

**Response 204 No Content**

## Token Lifecycle Management

### Automatic Expiration Tracking

The service runs a background worker that:
- **Every 5 minutes**: Marks connections as `expired` if their tokens have passed the expiration time
- Publishes events when connections are refreshed or revoked
- Coordinates with the auth service for actual token refresh operations

### Token Refresh Flow

1. External service (e.g., auth-service) detects expired token
2. External service performs OAuth refresh flow with provider
3. External service calls `PUT /connections/:id/tokens` with new tokens
4. Connection status updated to `active`
5. `oauth.connection.refreshed` event published via outbox

## Events

The service publishes domain events via the transactional outbox pattern:

### oauth.connection.linked
Published when a new OAuth connection is created.

```json
{
  "id": "evt_xxx",
  "type": "oauth.connection.linked",
  "version": "1.0",
  "occurredAt": "2024-01-15T10:30:00Z",
  "payload": {
    "connection": { "...": "..." }
  },
  "meta": {
    "source": "oauth-connections-service"
  }
}
```

### oauth.connection.refreshed
Published when connection tokens are updated.

### oauth.connection.revoked
Published when a connection is revoked.

## Database Schema

```prisma
model OAuthConnection {
  id          String            @id @default(cuid())
  providerId  String            // e.g., "google", "github"
  projectId   String
  tenantId    String?
  userId      String
  scope       String[]
  status      ConnectionStatus  @default(active)
  expiresAt   DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  tokenSet    TokenSet?
}

model TokenSet {
  id             String   @id @default(cuid())
  accessToken    String
  refreshToken   String?
  expiresIn      Int?
  tokenType      String?
  issuedAt       DateTime
  expiresAt      DateTime?
  idToken        String?
  connection     OAuthConnection @relation(fields: [connectionId], references: [id])
  connectionId   String  @unique
}
```

## Docker Deployment

```bash
# Build image
docker build -t oauth-connections-service .

# Run container
docker run -p 8202:8202 \
  -e DATABASE_URL=postgresql://... \
  -e INTERNAL_SERVICE_TOKEN=your-token \
  oauth-connections-service
```

## Kubernetes Deployment

```bash
# Deploy service
kubectl apply -f k8s/

# Check status
kubectl get pods -l app=oauth-connections-service
```

## Monitoring

### Health Check
```http
GET /v1/health
```

### Metrics
Prometheus metrics available at `/metrics`:
- `oauth_connections_linked_total{provider_id}`
- `oauth_connections_refreshed_total{provider_id}`
- `oauth_connections_revoked_total{provider_id, reason}`
- `oauth_token_refresh_errors_total{provider_id, error}`
- `outbox_events_processed_total{event_type}`

### Logging
Structured JSON logs with OpenTelemetry integration.

## Security

### Token Storage
- Tokens are stored in PostgreSQL with appropriate access controls
- Consider encrypting tokens at rest using database-level encryption
- Use connection pooling with SSL/TLS

### Service Authentication
- Internal service token or JWT required for all endpoints
- Tokens should be rotated regularly
- Use secure channels (HTTPS/TLS) in production

### Best Practices
- Never log access tokens or refresh tokens
- Implement token encryption at rest (future enhancement)
- Use secure random token generation
- Rotate internal service credentials regularly

## Troubleshooting

### Connections stuck in "refreshing" status
- Check if auth-service is properly updating tokens
- Review error logs for token refresh failures
- Verify provider OAuth endpoints are accessible

### High token refresh errors
- Verify provider credentials are correct
- Check provider rate limits
- Review refresh token validity

### Outbox events not processing
- Check NATS connection if using event bus
- Verify outbox processor is running
- Check database connectivity

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

For issues and questions:
- GitHub Issues: [opendex/identity-platform/issues](https://github.com/opendex/identity-platform/issues)
- Documentation: [docs.opendex.dev](https://docs.opendex.dev)
