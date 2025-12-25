# Notifications Service

Enterprise-grade notification delivery microservice supporting email, SMS, and webhooks with multi-provider fallback, retry logic, and comprehensive observability.

## Features

### Core Capabilities
- ✉️ **Multi-Channel Support**: Email, SMS, and Webhooks
- 🔄 **Provider Failover**: Automatic fallback across multiple providers
- 🔁 **Retry Logic**: Exponential backoff with configurable retry limits
- 📅 **Scheduled Delivery**: Schedule notifications for future delivery
- 📝 **Template Engine**: Variable substitution with versioning
- ⚡ **Async Processing**: Background worker with cron-based processing
- 🎯 **Priority Queuing**: Low, normal, high, and urgent priority levels
- 📊 **Observability**: Built-in metrics, logging, and health checks

### Supported Providers

#### Email Providers
- **SendGrid** (Priority 1)
- **AWS SES** (Priority 2)
- **SMTP** (Priority 3 - Universal fallback)

#### SMS Providers
- **Twilio** (Priority 1)
- **AWS SNS** (Priority 2)

#### Webhook Provider
- HTTP/HTTPS webhooks with customizable headers and methods

## Architecture

This service follows **Hexagonal Architecture** (Ports & Adapters) with **Domain-Driven Design** and **CQRS** patterns:

```
src/
├── domain/                 # Business logic & entities
│   ├── entities/          # Domain entities (Notification, Template)
│   ├── value-objects/     # Value objects (Status, Channel)
│   └── ports/             # Interfaces (repositories, providers)
├── application/           # Use cases & orchestration
│   ├── commands/          # Write operations
│   ├── queries/           # Read operations
│   ├── handlers/          # CQRS handlers
│   └── events/            # Domain events
├── infrastructure/        # External adapters
│   ├── providers/         # Email/SMS/Webhook implementations
│   ├── repositories/      # Prisma repositories
│   ├── services/          # Dispatcher service
│   └── workers/           # Background workers
└── modules/               # NestJS modules & controllers
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
DATABASE_URL="postgresql://user:password@localhost:5432/notifications"

# Server
PORT=8201
NODE_ENV=development

# Email Providers (configure at least one)
SENDGRID_API_KEY=SG.xxxxx
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAxxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=user
SMTP_PASSWORD=pass

# SMS Providers (optional)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
```

### Development

```bash
# Start in development mode
pnpm start:dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

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

### Send Notification

```http
POST /v1/notifications
Content-Type: application/json

{
  "projectId": "proj_123",
  "tenantId": "tenant_123",
  "userId": "user_123",
  "channel": "email",
  "payload": {
    "to": ["user@example.com"],
    "from": "noreply@example.com",
    "subject": "Welcome!",
    "body": "Welcome to our platform",
    "htmlBody": "<h1>Welcome!</h1>"
  },
  "priority": "high",
  "scheduledFor": "2024-12-31T00:00:00Z",
  "tags": {
    "campaign": "welcome",
    "version": "v2"
  }
}
```

### Send with Template

```http
POST /v1/notifications
Content-Type: application/json

{
  "projectId": "proj_123",
  "channel": "email",
  "templateName": "welcome-email",
  "templateVariables": {
    "name": "John Doe",
    "companyName": "Acme Inc"
  },
  "payload": {
    "to": ["user@example.com"],
    "from": "noreply@example.com"
  }
}
```

### Get Notification

```http
GET /v1/notifications/:id
```

### List Notifications

```http
GET /v1/notifications?projectId=proj_123&status=delivered,failed&limit=50
```

### Cancel Notification

```http
DELETE /v1/notifications/:id
Content-Type: application/json

{
  "reason": "User unsubscribed"
}
```

## Notification Lifecycle

```mermaid
graph TD
    A[Requested] --> B[Scheduled]
    B --> C[Dispatched]
    C --> D{Success?}
    D -->|Yes| E[Delivered]
    D -->|No| F{Retriable?}
    F -->|Yes| G{Max Retries?}
    F -->|No| H[Failed]
    G -->|No| B
    G -->|Yes| H
    A --> I[Cancelled]
```

## Provider Fallback

The service automatically falls back to the next provider if one fails:

```
Email: SendGrid → AWS SES → SMTP
SMS:   Twilio → AWS SNS
```

Providers are selected based on:
1. **Enabled status**: Provider must be configured
2. **Priority**: Lower priority number = higher precedence
3. **Validation**: Payload must pass provider validation

## Retry Strategy

- **Max Attempts**: 3 (configurable per notification)
- **Backoff**: Exponential (1s, 2s, 4s, 8s, ...)
- **Max Delay**: 5 minutes
- **Retriable Errors**: Network errors, 5xx responses, rate limiting
- **Non-Retriable**: Invalid payload, 4xx errors (except 429)

## Worker Processes

The service runs three background workers:

1. **Scheduled Notifications** (every 10 seconds)
   - Processes notifications scheduled for delivery
   - Checks expiration and cancels if needed

2. **Failed Retries** (every 1 minute)
   - Retries failed notifications with backoff
   - Respects max retry limits

3. **Requested Notifications** (every 5 minutes)
   - Processes newly requested notifications
   - Ensures no notification is missed

## Docker Deployment

```bash
# Build image
docker build -t notifications-service .

# Run container
docker run -p 8201:8201 \
  -e DATABASE_URL=postgresql://... \
  -e SENDGRID_API_KEY=SG.xxxxx \
  notifications-service
```

## Kubernetes Deployment

```bash
# Create secrets
kubectl apply -f k8s/secrets.example.yaml

# Deploy ConfigMap
kubectl apply -f k8s/configmap.yaml

# Deploy service
kubectl apply -f k8s/deployment.yaml

# Enable autoscaling
kubectl apply -f k8s/hpa.yaml
```

## Monitoring

### Health Check
```http
GET /v1/health
```

### Metrics
Prometheus metrics available at `/metrics`:
- `notifications_sent_total{channel, provider, status}`
- `notifications_duration_seconds{channel, provider}`
- `notifications_retry_total{channel, reason}`
- `provider_health{provider, channel}`

### Logging
Structured JSON logs with levels:
- `error`: Failed operations requiring attention
- `warn`: Degraded state or fallback scenarios
- `log`: Normal operations and state changes
- `debug`: Detailed debugging information

## Testing

### Unit Tests
```bash
pnpm test
```

Tests domain entities, value objects, and handlers in isolation.

### Integration Tests
```bash
pnpm test -- provider
```

Tests provider implementations with HTTP mocking.

### E2E Tests
```bash
pnpm test:e2e
```

Tests complete notification flows through the API.

## Best Practices

### Error Handling
- Always validate payloads before sending
- Use retriable errors for temporary failures
- Log detailed error context for debugging

### Performance
- Use batch operations for multiple notifications
- Schedule non-urgent notifications for off-peak hours
- Monitor provider rate limits

### Security
- Store provider credentials in secrets management
- Validate webhook URLs to prevent SSRF
- Use TLS for all external communication
- Sanitize template variables to prevent injection

## Troubleshooting

### Notifications stuck in "requested" status
- Check worker service logs
- Verify at least one provider is configured
- Ensure database connectivity

### Provider failures
- Verify credentials are correct
- Check provider service status
- Review error logs for specific error codes

### High retry rates
- Review payload validation
- Check provider rate limits
- Verify network connectivity

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

For issues and questions:
- GitHub Issues: [opendex/identity-platform/issues](https://github.com/opendex/identity-platform/issues)
- Documentation: [docs.opendex.dev](https://docs.opendex.dev)
