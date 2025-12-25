# 🔐 OpenDex Auth Service

Enterprise-grade **OAuth2/OIDC Authentication Microservice** built with NestJS, featuring hexagonal architecture, domain-driven design, and production-ready observability.

## ✨ Features

### Core Authentication
- ✅ **OAuth 2.0** - Full RFC 6749 implementation
- ✅ **OpenID Connect (OIDC)** - Standard claims & UserInfo endpoint
- ✅ **PKCE Support** - Enhanced security for public clients
- ✅ **Token Management** - Access tokens, refresh tokens, revocation
- ✅ **Multi-tenancy** - Support for multiple clients

### OAuth Providers
- ✅ **13 Social Login Providers**:
  - GitHub, Google, Microsoft
  - Facebook, Spotify, Discord
  - GitLab, Apple, Bitbucket
  - LinkedIn, X (Twitter), Twitch
  - + Easy to add more

### Architecture
- 🏛️ **Hexagonal Architecture** - Clean separation of concerns
- 🎯 **Domain-Driven Design (DDD)** - Entities, Value Objects, Repositories
- 📊 **CQRS Pattern** - Commands & Queries separation
- 🔄 **Event-Driven** - Async integration capabilities

### Production Ready
- 🐳 **Docker** - Multi-stage optimized builds
- 🔍 **Observability** - Sentry, OpenTelemetry, Prometheus
- 🏥 **Health Checks** - Kubernetes-ready probes
- 🚦 **Rate Limiting** - Redis-backed protection
- 📝 **API Documentation** - OpenAPI/Swagger
- 🧪 **Testing** - Unit, Integration, E2E ready

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway / BFF                     │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
    ┌────────▼────────┐          ┌────────▼────────────┐
    │  Auth Service   │          │  Other Services     │
    │  (This repo)    │          │                     │
    │                 │          │                     │
    │  - OAuth2/OIDC  │          │                     │
    │  - 13 Providers │          │                     │
    │  - JWT Tokens   │          │                     │
    │  - PKCE         │          │                     │
    └────────┬────────┘          └─────────────────────┘
             │
    ┌────────▼────────────┐
    │   PostgreSQL DB     │
    │                     │
    │  - Users            │
    │  - Clients          │
    │  - Tokens           │
    │  - Sessions         │
    └─────────────────────┘
```

## 📂 Project Structure

```
src/
├── core/                            # Core domain (DDD)
│   ├── domain/                      # Domain entities & value objects
│   ├── application/                 # Use cases (CQRS)
│   └── infrastructure/              # Infrastructure (DB, Redis, etc.)
│
├── modules/
│   ├── oauth/                       # OAuth2/OIDC module
│   │   ├── controllers/             # Authorize, Token, UserInfo
│   │   ├── services/                # OAuth2, Token, PKCE services
│   │   ├── guards/                  # OAuth2 & Scope guards
│   │   └── dto/                     # Request/Response DTOs
│   │
│   ├── providers/                   # OAuth provider integrations
│   │   ├── base/                    # Base provider & factory
│   │   ├── github/                  # GitHub provider
│   │   ├── google/                  # Google provider
│   │   └── ... (11 more)
│   │
│   ├── auth/                        # Auth module
│   └── health/                      # Health checks
│
├── common/                          # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── guards/
│   └── exceptions/
│
└── config/                          # Configuration
    ├── app.config.ts
    ├── database.config.ts
    ├── redis.config.ts
    └── observability.config.ts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### 1. Clone & Install

```bash
cd apps/auth-service
cp .env.example .env
npm install
```

### 2. Configure Environment

Edit `.env` with your configuration:

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/auth_db"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key

# OAuth Providers
OAUTH_GITHUB_CLIENT_ID=your_github_id
OAUTH_GITHUB_CLIENT_SECRET=your_github_secret
# ... add more providers
```

### 3. Run with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Auth Service)
docker-compose up -d

# View logs
docker-compose logs -f auth-service

# Stop services
docker-compose down
```

### 4. Development Mode

```bash
# Run migrations
pnpm prisma migrate dev

# Generate Prisma Client
pnpm prisma generate

# Start dev server
pnpm run start:dev

# Open Prisma Studio
pnpm prisma studio
```

## 📖 API Documentation

Once running, access the interactive API documentation:

- **Swagger UI**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health
- **Service Info**: http://localhost:3000/api/auth/info

## 🔑 OAuth2 Flow

### 1. Authorization Request

```http
GET /oauth/authorize?
    response_type=code
    &client_id=YOUR_CLIENT_ID
    &redirect_uri=https://yourapp.com/callback
    &scope=openid profile email
    &state=random_state_string
    &code_challenge=PKCE_CHALLENGE
    &code_challenge_method=S256
```

### 2. Token Exchange

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&code_verifier=PKCE_VERIFIER
```

### 3. UserInfo Request

```http
GET /oauth/userinfo
Authorization: Bearer ACCESS_TOKEN
```

## 🌐 Social Login Flow

### GitHub Example

```http
# 1. Start GitHub OAuth flow
GET /auth/providers/github/authorize?redirect_uri=https://yourapp.com/callback

# 2. User authorizes on GitHub, redirected back
GET /auth/providers/github/callback?code=GITHUB_CODE&state=STATE

# 3. Service returns your app's authorization code
# 4. Exchange it for access tokens (see OAuth2 flow above)
```

## 🐳 Docker

### Build Production Image

```bash
docker build -t auth-service:latest .
```

### Run with Docker Compose

```bash
# Full stack (recommended for development)
docker-compose up -d

# With monitoring (Prometheus + Grafana)
docker-compose --profile monitoring up -d

# With Prisma Studio
docker-compose --profile dev up -d
```

## 🧪 Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 📊 Database

### Migrations

```bash
# Create migration
pnpm prisma migrate dev --name your_migration_name

# Apply migrations
pnpm prisma migrate deploy

# Reset database (dev only)
pnpm prisma migrate reset
```

### Schema Management

```bash
# Open Prisma Studio
pnpm prisma studio

# Generate Prisma Client
pnpm prisma generate

# Format schema
pnpm prisma format
```

## 🔍 Observability

### Health Checks

```bash
# Liveness probe
curl http://localhost:3000/api/health/live

# Readiness probe
curl http://localhost:3000/api/health/ready

# Full health check
curl http://localhost:3000/api/health
```

### Metrics

- **Prometheus**: http://localhost:9090 (with monitoring profile)
- **Grafana**: http://localhost:3001 (with monitoring profile)

### Logging

Structured JSON logs with Winston, includes:
- Request/Response logging
- Error tracking
- Performance metrics
- Audit trails

## 🔐 Security

### Implemented

- ✅ PKCE for public clients
- ✅ State parameter validation
- ✅ Secure token storage (hashed)
- ✅ Rate limiting per endpoint
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Input validation (class-validator)
- ✅ SQL injection protection (Prisma)
- ✅ XSS protection

### Best Practices

- Use HTTPS in production
- Rotate JWT secrets regularly
- Enable MFA for sensitive operations
- Monitor failed authentication attempts
- Implement token rotation
- Use short-lived access tokens

## 🚢 Deployment

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: auth-service
        image: auth-service:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/health/live
            port: 3000
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
```

### Environment Variables

See `.env.example` for all available configuration options.

## 📝 Adding New OAuth Providers

1. Create provider class:

```typescript
// src/modules/providers/custom/custom.provider.ts
import { BaseOAuthProvider } from '../base/base-oauth-provider';

export class CustomProvider extends BaseOAuthProvider {
  constructor(config: OAuthProviderConfig) {
    super('custom', config);
  }

  async getAuthorizationUrl(options) { /* ... */ }
  async getAccessToken(code, redirectUri) { /* ... */ }
  async getUserProfile(accessToken) { /* ... */ }
}
```

2. Register in factory:

```typescript
// src/modules/providers/base/oauth-provider.factory.ts
this.providers.set('custom', CustomProvider);
```

3. Add environment variables:

```bash
OAUTH_CUSTOM_CLIENT_ID=your_id
OAUTH_CUSTOM_CLIENT_SECRET=your_secret
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- NestJS for the amazing framework
- Prisma for the excellent ORM
- The OAuth2/OIDC community for the standards

---

**Built with ❤️ by the OpenDex Team**

For questions or support, please open an issue on GitHub.
