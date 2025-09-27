# 🔌 Opendex Identity Employee - API Documentation

## 📋 Tabla de Contenidos

- [Autenticación](#autenticación)
- [Gestión de Usuarios](#gestión-de-usuarios)
- [Gestión de Equipos](#gestión-de-equipos)
- [Gestión de Permisos](#gestión-de-permisos)
- [Webhooks](#webhooks)
- [Rate Limiting](#rate-limiting)
- [Códigos de Error](#códigos-de-error)
- [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🔐 Autenticación

### Headers Requeridos

```http
Authorization: Bearer <access_token>
Content-Type: application/json
X-API-Version: v1
```

### Obtener Token de Acceso

#### POST `/api/latest/auth/password/sign-in`

**Descripción:** Iniciar sesión con credenciales de usuario.

**Request Body:**
```json
{
  "email": "usuario@opendex.com",
  "password": "contraseña_segura",
  "rememberMe": false,
  "mfaCode": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123456789",
      "email": "usuario@opendex.com",
      "displayName": "Juan Pérez",
      "emailVerified": true,
      "mfaEnabled": true,
      "teams": [
        {
          "id": "team_engineering",
          "name": "Ingeniería",
          "role": "developer"
        }
      ],
      "permissions": [
        "users:read",
        "teams:read",
        "projects:read"
      ],
      "lastSignInAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "session": {
      "id": "session_987654321",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2024-01-15T18:30:00Z",
      "expiresIn": 28800
    }
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña incorrectos",
    "details": {
      "attempts": 3,
      "maxAttempts": 5,
      "lockoutTime": "2024-01-15T11:00:00Z"
    }
  }
}
```

#### POST `/api/latest/auth/oauth/authorize`

**Descripción:** Iniciar flujo de autorización OAuth.

**Request Body:**
```json
{
  "provider": "google",
  "redirectUri": "https://app.opendex.com/auth/callback",
  "state": "random_state_string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://accounts.google.com/oauth/authorize?client_id=...",
    "state": "random_state_string",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

#### POST `/api/latest/auth/oauth/callback`

**Descripción:** Procesar callback de OAuth.

**Request Body:**
```json
{
  "provider": "google",
  "code": "authorization_code",
  "state": "random_state_string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123456789",
      "email": "usuario@opendex.com",
      "displayName": "Juan Pérez",
      "provider": "google",
      "providerId": "google_123456789"
    },
    "session": {
      "id": "session_987654321",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2024-01-15T18:30:00Z"
    }
  }
}
```

#### POST `/api/latest/auth/magic-link/send`

**Descripción:** Enviar magic link por email.

**Request Body:**
```json
{
  "email": "usuario@opendex.com",
  "redirectUri": "https://app.opendex.com/auth/callback"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Magic link enviado a usuario@opendex.com",
    "expiresAt": "2024-01-15T11:15:00Z"
  }
}
```

#### POST `/api/latest/auth/sessions/refresh`

**Descripción:** Renovar token de acceso.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-01-15T18:30:00Z",
    "expiresIn": 28800
  }
}
```

#### POST `/api/latest/auth/sessions/revoke`

**Descripción:** Revocar sesión actual.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Sesión revocada exitosamente"
  }
}
```

---

## 👥 Gestión de Usuarios

### GET `/api/latest/users`

**Descripción:** Listar usuarios con filtros y paginación.

**Query Parameters:**
- `page` (integer, optional): Número de página (default: 1)
- `limit` (integer, optional): Elementos por página (default: 20, max: 100)
- `team` (string, optional): Filtrar por ID de equipo
- `role` (string, optional): Filtrar por rol
- `search` (string, optional): Búsqueda por nombre o email
- `status` (string, optional): Filtrar por estado (active, inactive, pending)
- `sortBy` (string, optional): Campo de ordenamiento (name, email, createdAt, lastSignInAt)
- `sortOrder` (string, optional): Orden (asc, desc, default: asc)

**Example Request:**
```http
GET /api/latest/users?page=1&limit=20&team=team_engineering&search=juan&sortBy=name&sortOrder=asc
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123456789",
        "email": "juan.perez@opendex.com",
        "displayName": "Juan Pérez",
        "firstName": "Juan",
        "lastName": "Pérez",
        "avatar": "https://cdn.opendex.com/avatars/user_123456789.jpg",
        "emailVerified": true,
        "mfaEnabled": true,
        "status": "active",
        "teams": [
          {
            "id": "team_engineering",
            "name": "Ingeniería",
            "role": "developer",
            "permissions": [
              "projects:read",
              "projects:write",
              "users:read"
            ]
          }
        ],
        "lastSignInAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "team": "team_engineering",
      "search": "juan",
      "sortBy": "name",
      "sortOrder": "asc"
    }
  }
}
```

### GET `/api/latest/users/{userId}`

**Descripción:** Obtener detalles de un usuario específico.

**Path Parameters:**
- `userId` (string, required): ID del usuario

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123456789",
      "email": "juan.perez@opendex.com",
      "displayName": "Juan Pérez",
      "firstName": "Juan",
      "lastName": "Pérez",
      "avatar": "https://cdn.opendex.com/avatars/user_123456789.jpg",
      "emailVerified": true,
      "mfaEnabled": true,
      "status": "active",
      "teams": [
        {
          "id": "team_engineering",
          "name": "Ingeniería",
          "role": "developer",
          "permissions": [
            "projects:read",
            "projects:write",
            "users:read"
          ],
          "joinedAt": "2024-01-01T00:00:00Z"
        }
      ],
      "permissions": [
        "users:read",
        "projects:read",
        "projects:write"
      ],
      "lastSignInAt": "2024-01-15T10:30:00Z",
      "lastSignInIp": "192.168.1.100",
      "signInCount": 45,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### POST `/api/latest/users`

**Descripción:** Crear nuevo usuario.

**Request Body:**
```json
{
  "email": "nuevo.usuario@opendex.com",
  "displayName": "María García",
  "firstName": "María",
  "lastName": "García",
  "teamId": "team_engineering",
  "role": "developer",
  "sendInvitation": true,
  "customFields": {
    "employeeId": "EMP001",
    "department": "Engineering",
    "manager": "user_123456789"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_987654321",
      "email": "nuevo.usuario@opendex.com",
      "displayName": "María García",
      "firstName": "María",
      "lastName": "García",
      "status": "pending_invitation",
      "emailVerified": false,
      "mfaEnabled": false,
      "teams": [
        {
          "id": "team_engineering",
          "name": "Ingeniería",
          "role": "developer"
        }
      ],
      "createdAt": "2024-01-15T11:00:00Z"
    },
    "invitation": {
      "id": "invitation_123456789",
      "token": "inv_token_abc123",
      "expiresAt": "2024-01-22T11:00:00Z",
      "emailSent": true
    }
  }
}
```

### PUT `/api/latest/users/{userId}`

**Descripción:** Actualizar usuario existente.

**Path Parameters:**
- `userId` (string, required): ID del usuario

**Request Body:**
```json
{
  "displayName": "Juan Carlos Pérez",
  "firstName": "Juan Carlos",
  "lastName": "Pérez",
  "status": "active",
  "customFields": {
    "employeeId": "EMP002",
    "department": "Engineering",
    "manager": "user_111222333"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123456789",
      "email": "juan.perez@opendex.com",
      "displayName": "Juan Carlos Pérez",
      "firstName": "Juan Carlos",
      "lastName": "Pérez",
      "status": "active",
      "updatedAt": "2024-01-15T11:30:00Z"
    }
  }
}
```

### DELETE `/api/latest/users/{userId}`

**Descripción:** Eliminar usuario (soft delete).

**Path Parameters:**
- `userId` (string, required): ID del usuario

**Query Parameters:**
- `permanent` (boolean, optional): Eliminación permanente (default: false)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Usuario eliminado exitosamente",
    "deletedAt": "2024-01-15T11:45:00Z",
    "permanent": false
  }
}
```

### POST `/api/latest/users/{userId}/suspend`

**Descripción:** Suspender usuario.

**Path Parameters:**
- `userId` (string, required): ID del usuario

**Request Body:**
```json
{
  "reason": "Violación de políticas de seguridad",
  "duration": 7,
  "notifyUser": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Usuario suspendido exitosamente",
    "suspendedAt": "2024-01-15T12:00:00Z",
    "suspendedUntil": "2024-01-22T12:00:00Z",
    "reason": "Violación de políticas de seguridad"
  }
}
```

### POST `/api/latest/users/{userId}/unsuspend`

**Descripción:** Reactivar usuario suspendido.

**Path Parameters:**
- `userId` (string, required): ID del usuario

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Usuario reactivado exitosamente",
    "unsuspendedAt": "2024-01-15T12:15:00Z"
  }
}
```

---

## 🏢 Gestión de Equipos

### GET `/api/latest/teams`

**Descripción:** Listar equipos con filtros y paginación.

**Query Parameters:**
- `page` (integer, optional): Número de página (default: 1)
- `limit` (integer, optional): Elementos por página (default: 20, max: 100)
- `search` (string, optional): Búsqueda por nombre
- `sortBy` (string, optional): Campo de ordenamiento (name, memberCount, createdAt)
- `sortOrder` (string, optional): Orden (asc, desc, default: asc)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "id": "team_engineering",
        "displayName": "Ingeniería",
        "description": "Equipo de desarrollo e ingeniería",
        "avatar": "https://cdn.opendex.com/teams/engineering.jpg",
        "memberCount": 25,
        "owner": {
          "id": "user_123456789",
          "displayName": "Juan Pérez",
          "email": "juan.perez@opendex.com"
        },
        "permissions": [
          "projects:read",
          "projects:write",
          "users:read"
        ],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### GET `/api/latest/teams/{teamId}`

**Descripción:** Obtener detalles de un equipo específico.

**Path Parameters:**
- `teamId` (string, required): ID del equipo

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_engineering",
      "displayName": "Ingeniería",
      "description": "Equipo de desarrollo e ingeniería",
      "avatar": "https://cdn.opendex.com/teams/engineering.jpg",
      "owner": {
        "id": "user_123456789",
        "displayName": "Juan Pérez",
        "email": "juan.perez@opendex.com"
      },
      "members": [
        {
          "id": "user_123456789",
          "displayName": "Juan Pérez",
          "email": "juan.perez@opendex.com",
          "role": "owner",
          "permissions": [
            "projects:read",
            "projects:write",
            "users:read",
            "users:write"
          ],
          "joinedAt": "2024-01-01T00:00:00Z"
        },
        {
          "id": "user_987654321",
          "displayName": "María García",
          "email": "maria.garcia@opendex.com",
          "role": "developer",
          "permissions": [
            "projects:read",
            "projects:write"
          ],
          "joinedAt": "2024-01-10T00:00:00Z"
        }
      ],
      "memberCount": 25,
      "permissions": [
        "projects:read",
        "projects:write",
        "users:read"
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### POST `/api/latest/teams`

**Descripción:** Crear nuevo equipo.

**Request Body:**
```json
{
  "displayName": "Nuevo Equipo",
  "description": "Descripción del nuevo equipo",
  "ownerId": "user_123456789",
  "permissions": [
    "projects:read",
    "projects:write"
  ],
  "settings": {
    "allowSelfJoin": false,
    "requireApproval": true,
    "maxMembers": 50
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_new_123456789",
      "displayName": "Nuevo Equipo",
      "description": "Descripción del nuevo equipo",
      "owner": {
        "id": "user_123456789",
        "displayName": "Juan Pérez",
        "email": "juan.perez@opendex.com"
      },
      "memberCount": 1,
      "permissions": [
        "projects:read",
        "projects:write"
      ],
      "createdAt": "2024-01-15T12:00:00Z"
    }
  }
}
```

### PUT `/api/latest/teams/{teamId}`

**Descripción:** Actualizar equipo existente.

**Path Parameters:**
- `teamId` (string, required): ID del equipo

**Request Body:**
```json
{
  "displayName": "Equipo de Ingeniería Actualizado",
  "description": "Nueva descripción del equipo",
  "permissions": [
    "projects:read",
    "projects:write",
    "users:read"
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "team": {
      "id": "team_engineering",
      "displayName": "Equipo de Ingeniería Actualizado",
      "description": "Nueva descripción del equipo",
      "permissions": [
        "projects:read",
        "projects:write",
        "users:read"
      ],
      "updatedAt": "2024-01-15T12:15:00Z"
    }
  }
}
```

### DELETE `/api/latest/teams/{teamId}`

**Descripción:** Eliminar equipo.

**Path Parameters:**
- `teamId` (string, required): ID del equipo

**Query Parameters:**
- `transferOwnership` (string, optional): ID del usuario al que transferir la propiedad

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Equipo eliminado exitosamente",
    "deletedAt": "2024-01-15T12:30:00Z"
  }
}
```

### POST `/api/latest/teams/{teamId}/members`

**Descripción:** Agregar miembro al equipo.

**Path Parameters:**
- `teamId` (string, required): ID del equipo

**Request Body:**
```json
{
  "userId": "user_987654321",
  "role": "developer",
  "permissions": [
    "projects:read",
    "projects:write"
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "membership": {
      "id": "membership_123456789",
      "userId": "user_987654321",
      "teamId": "team_engineering",
      "role": "developer",
      "permissions": [
        "projects:read",
        "projects:write"
      ],
      "joinedAt": "2024-01-15T12:45:00Z"
    }
  }
}
```

### DELETE `/api/latest/teams/{teamId}/members/{userId}`

**Descripción:** Remover miembro del equipo.

**Path Parameters:**
- `teamId` (string, required): ID del equipo
- `userId` (string, required): ID del usuario

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Miembro removido del equipo exitosamente",
    "removedAt": "2024-01-15T13:00:00Z"
  }
}
```

### POST `/api/latest/teams/{teamId}/invitations`

**Descripción:** Enviar invitación a equipo.

**Path Parameters:**
- `teamId` (string, required): ID del equipo

**Request Body:**
```json
{
  "email": "nuevo.miembro@opendex.com",
  "role": "developer",
  "permissions": [
    "projects:read",
    "projects:write"
  ],
  "message": "Te invitamos a unirte a nuestro equipo de ingeniería",
  "expiresIn": 7
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "invitation": {
      "id": "invitation_123456789",
      "email": "nuevo.miembro@opendex.com",
      "teamId": "team_engineering",
      "role": "developer",
      "permissions": [
        "projects:read",
        "projects:write"
      ],
      "token": "inv_token_xyz789",
      "expiresAt": "2024-01-22T13:00:00Z",
      "status": "pending",
      "emailSent": true
    }
  }
}
```

---

## 🔐 Gestión de Permisos

### GET `/api/latest/permissions`

**Descripción:** Listar todos los permisos disponibles.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "permissions": [
      {
        "id": "users:read",
        "name": "Leer usuarios",
        "description": "Ver información de usuarios",
        "category": "users",
        "level": "read"
      },
      {
        "id": "users:write",
        "name": "Escribir usuarios",
        "description": "Crear y modificar usuarios",
        "category": "users",
        "level": "write"
      },
      {
        "id": "users:delete",
        "name": "Eliminar usuarios",
        "description": "Eliminar usuarios del sistema",
        "category": "users",
        "level": "delete"
      },
      {
        "id": "teams:read",
        "name": "Leer equipos",
        "description": "Ver información de equipos",
        "category": "teams",
        "level": "read"
      },
      {
        "id": "teams:write",
        "name": "Escribir equipos",
        "description": "Crear y modificar equipos",
        "category": "teams",
        "level": "write"
      },
      {
        "id": "projects:read",
        "name": "Leer proyectos",
        "description": "Ver información de proyectos",
        "category": "projects",
        "level": "read"
      },
      {
        "id": "projects:write",
        "name": "Escribir proyectos",
        "description": "Crear y modificar proyectos",
        "category": "projects",
        "level": "write"
      }
    ],
    "categories": [
      {
        "id": "users",
        "name": "Usuarios",
        "description": "Permisos relacionados con gestión de usuarios"
      },
      {
        "id": "teams",
        "name": "Equipos",
        "description": "Permisos relacionados con gestión de equipos"
      },
      {
        "id": "projects",
        "name": "Proyectos",
        "description": "Permisos relacionados con gestión de proyectos"
      }
    ]
  }
}
```

### GET `/api/latest/roles`

**Descripción:** Listar roles predefinidos.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "roles": [
      {
        "id": "super_admin",
        "name": "Super Administrador",
        "description": "Acceso completo al sistema",
        "permissions": [
          "users:read",
          "users:write",
          "users:delete",
          "teams:read",
          "teams:write",
          "teams:delete",
          "projects:read",
          "projects:write",
          "projects:delete"
        ],
        "color": "#D32F2F",
        "isSystem": true
      },
      {
        "id": "admin",
        "name": "Administrador",
        "description": "Administración de usuarios y equipos",
        "permissions": [
          "users:read",
          "users:write",
          "teams:read",
          "teams:write",
          "projects:read",
          "projects:write"
        ],
        "color": "#F57C00",
        "isSystem": true
      },
      {
        "id": "developer",
        "name": "Desarrollador",
        "description": "Acceso a proyectos de desarrollo",
        "permissions": [
          "projects:read",
          "projects:write"
        ],
        "color": "#1976D2",
        "isSystem": true
      },
      {
        "id": "viewer",
        "name": "Visualizador",
        "description": "Solo lectura",
        "permissions": [
          "users:read",
          "teams:read",
          "projects:read"
        ],
        "color": "#388E3C",
        "isSystem": true
      }
    ]
  }
}
```

---

## 🔗 Webhooks

### GET `/api/latest/webhooks`

**Descripción:** Listar webhooks configurados.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "webhook_123456789",
        "name": "User Events",
        "url": "https://api.opendex.com/webhooks/user-events",
        "events": [
          "user.created",
          "user.updated",
          "user.deleted"
        ],
        "secret": "whsec_abc123...",
        "status": "active",
        "lastDelivery": {
          "timestamp": "2024-01-15T10:30:00Z",
          "status": "success",
          "responseCode": 200
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### POST `/api/latest/webhooks`

**Descripción:** Crear nuevo webhook.

**Request Body:**
```json
{
  "name": "Team Events",
  "url": "https://api.opendex.com/webhooks/team-events",
  "events": [
    "team.created",
    "team.updated",
    "team.deleted",
    "team.member.added",
    "team.member.removed"
  ],
  "secret": "custom_secret_key"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "webhook": {
      "id": "webhook_987654321",
      "name": "Team Events",
      "url": "https://api.opendex.com/webhooks/team-events",
      "events": [
        "team.created",
        "team.updated",
        "team.deleted",
        "team.member.added",
        "team.member.removed"
      ],
      "secret": "whsec_xyz789...",
      "status": "active",
      "createdAt": "2024-01-15T13:30:00Z"
    }
  }
}
```

### Estructura de Eventos Webhook

```json
{
  "id": "evt_123456789",
  "type": "user.created",
  "created": "2024-01-15T10:30:00Z",
  "data": {
    "object": {
      "id": "user_123456789",
      "email": "nuevo.usuario@opendex.com",
      "displayName": "Nuevo Usuario",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

## ⚡ Rate Limiting

### Límites por Endpoint

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/auth/*` | 10 requests | 1 minuto |
| `/users/*` | 100 requests | 1 minuto |
| `/teams/*` | 100 requests | 1 minuto |
| `/permissions/*` | 200 requests | 1 minuto |
| `/webhooks/*` | 50 requests | 1 minuto |

### Headers de Rate Limiting

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
X-RateLimit-Retry-After: 60
```

### Response cuando se excede el límite

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Límite de requests excedido",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-15T11:00:00Z",
      "retryAfter": 60
    }
  }
}
```

---

## ❌ Códigos de Error

### Códigos de Error Comunes

| Código | HTTP Status | Descripción |
|--------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Credenciales incorrectas |
| `UNAUTHORIZED` | 401 | Token de acceso inválido o expirado |
| `FORBIDDEN` | 403 | Sin permisos para realizar la acción |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `VALIDATION_ERROR` | 422 | Error de validación en los datos |
| `RATE_LIMIT_EXCEEDED` | 429 | Límite de requests excedido |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |
| `SERVICE_UNAVAILABLE` | 503 | Servicio temporalmente no disponible |

### Estructura de Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error de validación en los datos enviados",
    "details": {
      "field": "email",
      "reason": "Formato de email inválido",
      "value": "email_invalido"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Flujo Completo de Autenticación

```javascript
// 1. Iniciar sesión
const loginResponse = await fetch('/api/latest/auth/password/sign-in', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'usuario@opendex.com',
    password: 'contraseña_segura'
  })
});

const loginData = await loginResponse.json();
const accessToken = loginData.data.session.accessToken;

// 2. Usar token para hacer requests autenticados
const usersResponse = await fetch('/api/latest/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const usersData = await usersResponse.json();
console.log('Usuarios:', usersData.data.users);
```

### Ejemplo 2: Crear Usuario y Enviar Invitación

```javascript
// Crear usuario
const createUserResponse = await fetch('/api/latest/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'nuevo.usuario@opendex.com',
    displayName: 'Nuevo Usuario',
    teamId: 'team_engineering',
    role: 'developer',
    sendInvitation: true
  })
});

const userData = await createUserResponse.json();
console.log('Usuario creado:', userData.data.user);
console.log('Invitación:', userData.data.invitation);
```

### Ejemplo 3: Gestionar Equipo

```javascript
// Crear equipo
const createTeamResponse = await fetch('/api/latest/teams', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    displayName: 'Equipo de Marketing',
    description: 'Equipo responsable de marketing digital',
    ownerId: 'user_123456789',
    permissions: ['projects:read', 'projects:write']
  })
});

const teamData = await createTeamResponse.json();
const teamId = teamData.data.team.id;

// Agregar miembro al equipo
const addMemberResponse = await fetch(`/api/latest/teams/${teamId}/members`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user_987654321',
    role: 'marketer',
    permissions: ['projects:read']
  })
});

const memberData = await addMemberResponse.json();
console.log('Miembro agregado:', memberData.data.membership);
```

### Ejemplo 4: Configurar Webhook

```javascript
// Crear webhook
const createWebhookResponse = await fetch('/api/latest/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'User Management Events',
    url: 'https://mi-app.com/webhooks/opendex',
    events: [
      'user.created',
      'user.updated',
      'user.deleted',
      'user.suspended',
      'user.unsuspended'
    ]
  })
});

const webhookData = await createWebhookResponse.json();
console.log('Webhook creado:', webhookData.data.webhook);
```

---

## 🔧 SDKs y Librerías

### JavaScript/TypeScript

```bash
npm install @opendex/identity-employee-sdk
```

```javascript
import { OpendexIdentityClient } from '@opendex/identity-employee-sdk';

const client = new OpendexIdentityClient({
  apiUrl: 'https://api.opendex.com',
  apiKey: 'your_api_key'
});

// Autenticación
const session = await client.auth.signIn({
  email: 'usuario@opendex.com',
  password: 'contraseña_segura'
});

// Gestión de usuarios
const users = await client.users.list({
  page: 1,
  limit: 20,
  team: 'team_engineering'
});

// Gestión de equipos
const team = await client.teams.create({
  displayName: 'Nuevo Equipo',
  description: 'Descripción del equipo',
  ownerId: 'user_123456789'
});
```

### Python

```bash
pip install opendex-identity-employee
```

```python
from opendex_identity import OpendexIdentityClient

client = OpendexIdentityClient(
    api_url='https://api.opendex.com',
    api_key='your_api_key'
)

# Autenticación
session = client.auth.sign_in(
    email='usuario@opendex.com',
    password='contraseña_segura'
)

# Gestión de usuarios
users = client.users.list(
    page=1,
    limit=20,
    team='team_engineering'
)

# Gestión de equipos
team = client.teams.create(
    display_name='Nuevo Equipo',
    description='Descripción del equipo',
    owner_id='user_123456789'
)
```

---

**© 2024 Opendex Corporation. Todos los derechos reservados.**

*Documentación de API - Opendex Identity Employee v1.0.0*
