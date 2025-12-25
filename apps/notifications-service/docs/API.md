# Notifications Service API Documentation

## Base URL
```
http://localhost:8201/v1
```

## Authentication
Currently, the service does not implement authentication. In production, you should add authentication middleware or use a service mesh for security.

## Endpoints

### Health Check

#### GET /health
Check service health and readiness.

**Response 200 OK**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "providers": { "status": "up" }
  }
}
```

---

### Send Notification

#### POST /notifications
Create and queue a new notification for delivery.

**Request Body**
```json
{
  "projectId": "string (required)",
  "tenantId": "string (optional)",
  "userId": "string (optional)",
  "channel": "email | sms | webhook (required)",
  "payload": "object (required)",
  "templateName": "string (optional)",
  "templateVariables": "object (optional)",
  "priority": "low | normal | high | urgent (optional, default: normal)",
  "scheduledFor": "ISO8601 datetime (optional)",
  "expiresAt": "ISO8601 datetime (optional)",
  "tags": "object (optional)"
}
```

**Email Payload Example**
```json
{
  "projectId": "proj_123",
  "channel": "email",
  "payload": {
    "to": ["user@example.com"],
    "cc": ["manager@example.com"],
    "bcc": ["archive@example.com"],
    "from": "noreply@example.com",
    "replyTo": "support@example.com",
    "subject": "Welcome to our platform",
    "body": "Plain text body",
    "htmlBody": "<h1>HTML body</h1>",
    "attachments": [
      {
        "filename": "document.pdf",
        "content": "base64-encoded-content",
        "contentType": "application/pdf"
      }
    ]
  }
}
```

**SMS Payload Example**
```json
{
  "projectId": "proj_123",
  "channel": "sms",
  "payload": {
    "to": "+1234567890",
    "from": "+0987654321",
    "body": "Your verification code is 123456"
  }
}
```

**Webhook Payload Example**
```json
{
  "projectId": "proj_123",
  "channel": "webhook",
  "payload": {
    "url": "https://api.example.com/webhooks",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token",
      "Content-Type": "application/json"
    },
    "body": {
      "event": "user.created",
      "data": { "userId": "123" }
    },
    "timeout": 30000
  }
}
```

**Template Example**
```json
{
  "projectId": "proj_123",
  "channel": "email",
  "templateName": "welcome-email",
  "templateVariables": {
    "name": "John Doe",
    "verificationLink": "https://app.example.com/verify?token=abc123"
  },
  "payload": {
    "to": ["john@example.com"],
    "from": "noreply@example.com"
  }
}
```

**Response 201 Created**
```json
{
  "id": "notif_clxxx",
  "projectId": "proj_123",
  "tenantId": "tenant_123",
  "userId": "user_123",
  "channel": "email",
  "status": "requested",
  "payload": { "...": "..." },
  "attempts": 0,
  "maxAttempts": 3,
  "priority": "normal",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses**
- `400 Bad Request`: Invalid payload or missing required fields
- `404 Not Found`: Template not found (when using templateName)
- `500 Internal Server Error`: Server error

---

### Get Notification

#### GET /notifications/:id
Retrieve a specific notification by ID.

**Path Parameters**
- `id` (string, required): Notification ID

**Response 200 OK**
```json
{
  "id": "notif_clxxx",
  "projectId": "proj_123",
  "channel": "email",
  "status": "delivered",
  "payload": { "...": "..." },
  "provider": "sendgrid",
  "providerMessageId": "msg_xyz",
  "attempts": 1,
  "maxAttempts": 3,
  "priority": "normal",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:05Z",
  "processedAt": "2024-01-15T10:30:05Z"
}
```

**Error Responses**
- `404 Not Found`: Notification not found

---

### List Notifications

#### GET /notifications
List notifications with optional filters.

**Query Parameters**
- `projectId` (string, optional): Filter by project
- `tenantId` (string, optional): Filter by tenant
- `userId` (string, optional): Filter by user
- `status` (string[], optional): Filter by status (comma-separated)
  - Values: `requested`, `scheduled`, `dispatched`, `delivered`, `failed`, `cancelled`
- `channel` (string[], optional): Filter by channel (comma-separated)
  - Values: `email`, `sms`, `webhook`
- `createdAfter` (ISO8601, optional): Filter by creation date
- `createdBefore` (ISO8601, optional): Filter by creation date
- `limit` (number, optional, default: 50, max: 100): Results per page
- `offset` (number, optional, default: 0): Pagination offset

**Example Request**
```
GET /notifications?projectId=proj_123&status=delivered,failed&limit=20
```

**Response 200 OK**
```json
[
  {
    "id": "notif_1",
    "projectId": "proj_123",
    "channel": "email",
    "status": "delivered",
    "...": "..."
  },
  {
    "id": "notif_2",
    "projectId": "proj_123",
    "channel": "sms",
    "status": "failed",
    "lastError": {
      "code": "INVALID_NUMBER",
      "message": "Invalid phone number format",
      "retriable": false,
      "occurredAt": "2024-01-15T10:30:05Z"
    },
    "...": "..."
  }
]
```

---

### Cancel Notification

#### DELETE /notifications/:id
Cancel a pending or scheduled notification.

**Path Parameters**
- `id` (string, required): Notification ID

**Request Body (Optional)**
```json
{
  "reason": "User unsubscribed"
}
```

**Response 204 No Content**

**Error Responses**
- `404 Not Found`: Notification not found
- `400 Bad Request`: Notification already processed

---

## Status Flow

```
requested → scheduled → dispatched → delivered
                ↓             ↓
            cancelled     failed
                          (retry) → scheduled
```

### Status Descriptions

- **requested**: Notification created, waiting to be processed
- **scheduled**: Scheduled for future delivery or retry
- **dispatched**: Currently being sent to provider
- **delivered**: Successfully delivered by provider
- **failed**: Permanently failed (max retries or non-retriable error)
- **cancelled**: Cancelled by user or system (e.g., expired)

## Error Codes

### Common Errors

| Code | Description | Retriable |
|------|-------------|-----------|
| `PROVIDER_DISABLED` | No enabled providers configured | No |
| `INVALID_PAYLOAD` | Payload validation failed | No |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `RATE_LIMITED` | Provider rate limit exceeded | Yes |
| `TIMEOUT` | Request timeout | Yes |
| `MAX_RETRIES_EXCEEDED` | Exceeded maximum retry attempts | No |

### Provider-Specific Errors

#### SendGrid
- `400`: Invalid request (check email format)
- `401`: Invalid API key
- `429`: Rate limited
- `500+`: Server error (retriable)

#### AWS SES
- `InvalidParameterValue`: Invalid email or configuration
- `MessageRejected`: Email rejected (invalid recipient)
- `ThrottlingException`: Rate limited (retriable)

#### Twilio
- `20003`: Authentication error
- `21211`: Invalid phone number
- `21429`: Rate limited (retriable)

## Rate Limits

The service implements rate limiting:
- **Default**: 100 requests per 60 seconds per IP
- **Burst**: Up to 100 requests in quick succession

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642252800
```

## Best Practices

### 1. Use Idempotency
Store notification IDs to avoid duplicate sends on retries.

### 2. Handle Webhooks Asynchronously
Webhook notifications should timeout quickly. Configure appropriate timeout values.

### 3. Monitor Failed Notifications
Set up alerts for notifications in `failed` status to catch provider issues.

### 4. Use Templates
Templates reduce payload size and centralize content management.

### 5. Set Expiration
For time-sensitive notifications (OTP codes), always set `expiresAt`.

### 6. Tag Notifications
Use tags for analytics and filtering:
```json
{
  "tags": {
    "campaign": "black-friday-2024",
    "segment": "premium-users",
    "version": "v2"
  }
}
```

## Code Examples

### Node.js (TypeScript)
```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8201/v1',
  headers: { 'Content-Type': 'application/json' }
});

async function sendEmail(to: string, subject: string, body: string) {
  const response = await client.post('/notifications', {
    projectId: 'proj_123',
    channel: 'email',
    payload: {
      to: [to],
      from: 'noreply@example.com',
      subject,
      body
    },
    priority: 'high'
  });

  return response.data;
}

// Usage
const notification = await sendEmail(
  'user@example.com',
  'Welcome!',
  'Thank you for signing up'
);

console.log(`Notification created: ${notification.id}`);
```

### cURL
```bash
# Send email notification
curl -X POST http://localhost:8201/v1/notifications \
  -H 'Content-Type: application/json' \
  -d '{
    "projectId": "proj_123",
    "channel": "email",
    "payload": {
      "to": ["user@example.com"],
      "from": "noreply@example.com",
      "subject": "Test Email",
      "body": "This is a test"
    }
  }'

# Get notification status
curl http://localhost:8201/v1/notifications/notif_clxxx

# List notifications
curl "http://localhost:8201/v1/notifications?projectId=proj_123&status=delivered&limit=10"

# Cancel notification
curl -X DELETE http://localhost:8201/v1/notifications/notif_clxxx \
  -H 'Content-Type: application/json' \
  -d '{"reason": "User requested cancellation"}'
```
