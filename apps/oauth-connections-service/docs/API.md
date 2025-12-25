# OAuth Connections Service - API Documentation

## Base URL
```
http://localhost:8202/v1
```

## Authentication

All endpoints require internal service authentication. Choose one method:

**Method 1: Service Token**
```
X-Internal-Service-Token: your-secure-token
```

**Method 2: JWT**
```
Authorization: Bearer your-jwt-token
```

## Endpoints

### Health Check

#### GET /health
Check service health and readiness.

**Response 200 OK**
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  }
}
```

---

### Link OAuth Connection

#### POST /connections
Create a new OAuth connection and store tokens.

**Request Body**
```json
{
  "id": "string (optional)",
  "providerId": "string (required)",
  "projectId": "string (required)",
  "tenantId": "string (optional)",
  "userId": "string (required)",
  "scope": ["string"] (required),
  "tokenSet": {
    "accessToken": "string (required)",
    "refreshToken": "string (optional)",
    "expiresIn": "number (optional)",
    "tokenType": "string (optional)",
    "issuedAt": "ISO8601 (required)",
    "expiresAt": "ISO8601 (optional)",
    "idToken": "string (optional)"
  },
  "expiresAt": "ISO8601 (optional)",
  "createdAt": "ISO8601 (optional)",
  "updatedAt": "ISO8601 (optional)"
}
```

**Example Request**
```json
{
  "providerId": "google",
  "projectId": "proj_abc123",
  "tenantId": "tenant_xyz789",
  "userId": "user_123",
  "scope": ["openid", "profile", "email", "https://www.googleapis.com/auth/calendar"],
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBxxxxxxx",
    "refreshToken": "1//0gOHxSbqvxxxxxxx",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T11:30:00Z",
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ..."
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response 201 Created**
```json
{
  "id": "conn_clxxx123",
  "providerId": "google",
  "projectId": "proj_abc123",
  "tenantId": "tenant_xyz789",
  "userId": "user_123",
  "scope": ["openid", "profile", "email", "https://www.googleapis.com/auth/calendar"],
  "status": "active",
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBxxxxxxx",
    "refreshToken": "1//0gOHxSbqvxxxxxxx",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T11:30:00Z",
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ..."
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid payload or missing required fields
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error

---

### List Connections

#### GET /connections
List all OAuth connections.

**Response 200 OK**
```json
[
  {
    "id": "conn_clxxx123",
    "providerId": "google",
    "projectId": "proj_abc123",
    "tenantId": "tenant_xyz789",
    "userId": "user_123",
    "scope": ["openid", "profile", "email"],
    "status": "active",
    "expiresAt": "2024-12-31T23:59:59Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "tokenSet": {
      "accessToken": "ya29.a0AfH6SMBxxxxxxx",
      "refreshToken": "1//0gOHxSbqvxxxxxxx",
      "expiresIn": 3600,
      "tokenType": "Bearer",
      "issuedAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-01-15T11:30:00Z"
    }
  },
  {
    "id": "conn_clyyy456",
    "providerId": "github",
    "projectId": "proj_abc123",
    "userId": "user_123",
    "scope": ["repo", "user"],
    "status": "expired",
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z",
    "tokenSet": {
      "accessToken": "gho_xxxxxxxxxxxxxxxx",
      "expiresIn": 28800,
      "tokenType": "bearer",
      "issuedAt": "2024-01-10T08:00:00Z",
      "expiresAt": "2024-01-10T16:00:00Z"
    }
  }
]
```

---

### Get Connection by ID

#### GET /connections/:id
Retrieve a specific OAuth connection.

**Path Parameters**
- `id` (string, required): Connection ID

**Response 200 OK**
```json
{
  "id": "conn_clxxx123",
  "providerId": "google",
  "projectId": "proj_abc123",
  "userId": "user_123",
  "status": "active",
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBxxxxxxx",
    "refreshToken": "1//0gOHxSbqvxxxxxxx",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-01-15T11:30:00Z"
  }
}
```

**Error Responses**
- `404 Not Found`: Connection not found

---

### Update Connection Tokens

#### PUT /connections/:id/tokens
Update the tokens for an existing connection (typically after refresh).

**Path Parameters**
- `id` (string, required): Connection ID

**Request Body**
```json
{
  "accessToken": "string (required)",
  "refreshToken": "string (optional)",
  "expiresIn": "number (optional)",
  "tokenType": "string (optional)",
  "issuedAt": "ISO8601 (required)",
  "expiresAt": "ISO8601 (optional)",
  "idToken": "string (optional)"
}
```

**Example Request**
```json
{
  "accessToken": "ya29.new_access_token",
  "refreshToken": "1//new_refresh_token",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "issuedAt": "2024-01-15T11:30:00Z",
  "expiresAt": "2024-01-15T12:30:00Z"
}
```

**Response 200 OK**
```json
{
  "id": "conn_clxxx123",
  "providerId": "google",
  "status": "active",
  "updatedAt": "2024-01-15T11:30:00Z",
  "tokenSet": {
    "accessToken": "ya29.new_access_token",
    "refreshToken": "1//new_refresh_token",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T11:30:00Z",
    "expiresAt": "2024-01-15T12:30:00Z"
  }
}
```

**Error Responses**
- `400 Bad Request`: Invalid token data
- `404 Not Found`: Connection not found

---

### Revoke Connection

#### POST /connections/:id/revoke
Revoke an OAuth connection (marks as revoked, does not delete).

**Path Parameters**
- `id` (string, required): Connection ID

**Response 200 OK**
```json
{
  "id": "conn_clxxx123",
  "providerId": "google",
  "status": "revoked",
  "updatedAt": "2024-01-15T11:45:00Z",
  "tokenSet": {
    "accessToken": "ya29.a0AfH6SMBxxxxxxx",
    "...": "..."
  }
}
```

**Error Responses**
- `404 Not Found`: Connection not found

---

### Delete Connection

#### DELETE /connections/:id
Permanently delete an OAuth connection and its tokens.

**Path Parameters**
- `id` (string, required): Connection ID

**Response 204 No Content**

**Error Responses**
- `404 Not Found`: Connection not found

---

## Connection Status Flow

```
linked → active → expired → refreshing → active
                              ↓
                          revoked
```

### Status Descriptions

- **active**: Connection is valid and tokens are current
- **refreshing**: Token refresh is in progress
- **expired**: Tokens have expired and need refresh
- **revoked**: User or system has revoked the connection

## Common Use Cases

### 1. Link New OAuth Connection

After user completes OAuth flow in your app:

```typescript
const response = await fetch('http://localhost:8202/v1/connections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
  },
  body: JSON.stringify({
    providerId: 'google',
    projectId: 'proj_123',
    userId: 'user_456',
    scope: ['openid', 'profile', 'email'],
    tokenSet: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      idToken: tokens.id_token,
    },
  }),
});

const connection = await response.json();
console.log('Connection created:', connection.id);
```

### 2. Refresh Expired Tokens

When tokens expire, refresh them and update:

```typescript
// 1. Detect expired token
const connection = await getConnectionById('conn_xxx');
if (connection.tokenSet.expiresAt < new Date()) {
  // 2. Perform OAuth refresh flow with provider
  const newTokens = await refreshWithProvider(
    connection.providerId,
    connection.tokenSet.refreshToken
  );

  // 3. Update connection with new tokens
  await fetch(`http://localhost:8202/v1/connections/${connection.id}/tokens`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || connection.tokenSet.refreshToken,
      expiresIn: newTokens.expires_in,
      tokenType: newTokens.token_type,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
    }),
  });
}
```

### 3. Revoke User Connection

When user disconnects their account:

```typescript
await fetch(`http://localhost:8202/v1/connections/${connectionId}/revoke`, {
  method: 'POST',
  headers: {
    'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
  },
});

// Optionally, also revoke with the OAuth provider
await revokeWithProvider(providerId, accessToken);
```

### 4. Get User's Active Connections

```typescript
const response = await fetch('http://localhost:8202/v1/connections', {
  headers: {
    'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
  },
});

const allConnections = await response.json();

// Filter for specific user and active status
const userActiveConnections = allConnections.filter(
  (c) => c.userId === 'user_456' && c.status === 'active'
);
```

## Error Codes

| Code | Description | Retriable |
|------|-------------|-----------|
| `400` | Bad Request - Invalid payload | No |
| `401` | Unauthorized - Missing/invalid auth | No |
| `404` | Not Found - Resource doesn't exist | No |
| `500` | Internal Server Error | Yes |
| `503` | Service Unavailable | Yes |

## Rate Limits

The service implements rate limiting:
- **Default**: 120 requests per 60 seconds
- **Burst**: Up to 120 requests in quick succession

Rate limit headers:
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1642252800
```

## Best Practices

### 1. Token Security
- Never log access tokens or refresh tokens
- Use HTTPS/TLS for all communications
- Rotate internal service credentials regularly

### 2. Error Handling
- Always handle 404 errors for connection lookups
- Implement retry logic for 500/503 errors
- Log errors with context but without sensitive data

### 3. Token Refresh
- Refresh tokens proactively before expiration
- Implement exponential backoff for refresh failures
- Handle cases where refresh token is invalid

### 4. Connection Lifecycle
- Always revoke with provider before deleting connection
- Monitor expired connections and clean up old ones
- Use events to coordinate with other services

## Webhooks & Events

The service publishes events via the transactional outbox pattern. Subscribe to these events in your event bus (NATS, Kafka, etc.):

### Event Types

**oauth.connection.linked**
```json
{
  "id": "evt_xxx",
  "type": "oauth.connection.linked",
  "version": "1.0",
  "occurredAt": "2024-01-15T10:30:00Z",
  "payload": {
    "connection": {
      "id": "conn_xxx",
      "providerId": "google",
      "userId": "user_123",
      "...": "..."
    }
  }
}
```

**oauth.connection.refreshed**
- Published when tokens are successfully updated

**oauth.connection.revoked**
- Published when connection is revoked

## Code Examples

### Node.js (TypeScript)

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8202/v1',
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Token': process.env.INTERNAL_SERVICE_TOKEN,
  },
});

async function linkConnection(userId: string, providerId: string, tokens: any) {
  const response = await client.post('/connections', {
    providerId,
    projectId: 'proj_123',
    userId,
    scope: tokens.scope.split(' '),
    tokenSet: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenType: tokens.token_type,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      idToken: tokens.id_token,
    },
  });

  return response.data;
}

async function getConnection(id: string) {
  const response = await client.get(`/connections/${id}`);
  return response.data;
}

async function updateTokens(id: string, newTokens: any) {
  const response = await client.put(`/connections/${id}/tokens`, {
    accessToken: newTokens.access_token,
    refreshToken: newTokens.refresh_token,
    expiresIn: newTokens.expires_in,
    tokenType: newTokens.token_type,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
  });

  return response.data;
}
```

### cURL

```bash
# Link connection
curl -X POST http://localhost:8202/v1/connections \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Service-Token: your-token' \
  -d '{
    "providerId": "google",
    "projectId": "proj_123",
    "userId": "user_123",
    "scope": ["openid", "profile", "email"],
    "tokenSet": {
      "accessToken": "ya29.xxx",
      "refreshToken": "1//xxx",
      "expiresIn": 3600,
      "tokenType": "Bearer",
      "issuedAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-01-15T11:30:00Z"
    }
  }'

# Get connection
curl http://localhost:8202/v1/connections/conn_xxx \
  -H 'X-Internal-Service-Token: your-token'

# Update tokens
curl -X PUT http://localhost:8202/v1/connections/conn_xxx/tokens \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Service-Token: your-token' \
  -d '{
    "accessToken": "ya29.new_token",
    "refreshToken": "1//new_refresh",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "issuedAt": "2024-01-15T11:30:00Z",
    "expiresAt": "2024-01-15T12:30:00Z"
  }'

# Revoke connection
curl -X POST http://localhost:8202/v1/connections/conn_xxx/revoke \
  -H 'X-Internal-Service-Token: your-token'

# Delete connection
curl -X DELETE http://localhost:8202/v1/connections/conn_xxx \
  -H 'X-Internal-Service-Token: your-token'
```
