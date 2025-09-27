# 🏢 Opendex Identity Employee
## Sistema de Gestión de Identidad de Empleados Corporativo

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/opendex/opendex-identity-employee)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-complete-brightgreen.svg)](docs/)
[![Security](https://img.shields.io/badge/security-enterprise-red.svg)](SECURITY.md)

---

## 📋 Tabla de Contenidos

- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Características Principales](#características-principales)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Instalación Rápida](#instalación-rápida)
- [Configuración Avanzada](#configuración-avanzada)
- [API Reference](#api-reference)
- [Guías de Usuario](#guías-de-usuario)
- [Seguridad y Compliance](#seguridad-y-compliance)
- [Troubleshooting](#troubleshooting)
- [Contribución](#contribución)
- [Soporte](#soporte)

---

## 🎯 Resumen Ejecutivo

**Opendex Identity Employee** es una solución empresarial de gestión de identidad y acceso (IAM) desarrollada específicamente para **Opendex Corporation**. Basada en la plataforma open-source Stack Auth, proporciona autenticación segura, autorización granular y gestión centralizada de empleados.

### 🏆 Beneficios Clave

- **🔒 Seguridad Empresarial**: MFA obligatorio, políticas de contraseña estrictas, auditoría completa
- **👥 Gestión Centralizada**: Administración unificada de usuarios, equipos y permisos
- **🚀 Escalabilidad**: Diseñado para crecer con la empresa (soporta millones de usuarios)
- **🔧 Personalización Total**: Branding corporativo, flujos de trabajo personalizados
- **📊 Analytics Avanzados**: Métricas de seguridad, uso y rendimiento
- **🌐 Integración Completa**: SSO con Google Workspace, Microsoft 365, SAML, LDAP

---

## ✨ Características Principales

### 🔐 Autenticación Multi-Factor

| Método | Estado | Descripción |
|--------|--------|-------------|
| **Contraseñas** | ✅ Activo | Políticas estrictas (12+ caracteres, complejidad) |
| **Magic Links** | ✅ Activo | Autenticación sin contraseña por email |
| **Passkeys** | ✅ Activo | Autenticación biométrica y claves de seguridad |
| **OTP/SMS** | ✅ Activo | Códigos de verificación por SMS |
| **OAuth 2.0** | ✅ Activo | Google, Microsoft, GitHub, LinkedIn |
| **SAML SSO** | ✅ Activo | Integración con proveedores empresariales |
| **LDAP/AD** | ✅ Activo | Active Directory y LDAP corporativo |

### 👥 Gestión de Usuarios y Equipos

- **Multi-tenancy**: Soporte para múltiples organizaciones
- **Roles Granulares**: Sistema de permisos basado en roles (RBAC)
- **Equipos Jerárquicos**: Estructura organizacional flexible
- **Invitations**: Sistema de invitaciones con aprobación
- **Bulk Operations**: Operaciones masivas de usuarios

### 📧 Sistema de Comunicación

- **Email Templates**: Plantillas corporativas personalizables
- **Multi-language**: Soporte para múltiples idiomas
- **Delivery Tracking**: Seguimiento de entrega de emails
- **Unsubscribe Management**: Gestión de preferencias de comunicación

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Opendex Identity Employee UI]
        B[Dashboard Administrativo]
        C[Componentes de Autenticación]
    end
    
    subgraph "API Layer"
        D[Next.js API Routes]
        E[Authentication Handlers]
        F[User Management APIs]
        G[Team Management APIs]
    end
    
    subgraph "Business Logic"
        H[Stack Auth Core]
        I[Opendex Custom Logic]
        J[Permission Engine]
        K[Audit System]
    end
    
    subgraph "Data Layer"
        L[(PostgreSQL)]
        M[Redis Cache]
        N[File Storage]
    end
    
    subgraph "External Services"
        O[Google Workspace]
        P[Microsoft 365]
        Q[SMTP Server]
        R[Webhook Endpoints]
    end
    
    A --> D
    B --> D
    C --> D
    D --> H
    E --> H
    F --> I
    G --> I
    H --> L
    I --> L
    J --> L
    K --> L
    H --> M
    I --> N
    E --> O
    E --> P
    F --> Q
    G --> R
```

### 🔧 Componentes Principales

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript | Interfaz de usuario corporativa |
| **Backend** | Next.js API Routes, Prisma | Lógica de negocio y APIs |
| **Database** | PostgreSQL 14+ | Almacenamiento de datos |
| **Cache** | Redis | Cache de sesiones y datos |
| **Auth** | JWT, OAuth 2.0, SAML | Autenticación y autorización |
| **Email** | SMTP, React Email | Comunicación corporativa |

---

## 🚀 Instalación Rápida

### Prerrequisitos

```bash
# Verificar versiones requeridas
node --version  # v20.0.0+
pnpm --version  # v9.0.0+
docker --version  # v20.0.0+
```

### 1. Clonar y Configurar

```bash
# Clonar el repositorio
git clone https://github.com/opendex/opendex-identity-employee.git
cd opendex-identity-employee

# Instalar dependencias
pnpm install

# Construir paquetes
pnpm build:packages

# Generar código
pnpm codegen
```

### 2. Configurar Variables de Entorno

```bash
# Copiar archivo de configuración
cp opendex-env-example.txt .env.local

# Editar configuración
nano .env.local
```

**Variables críticas:**
```env
# Opendex Identity Employee
NEXT_PUBLIC_STACK_PROJECT_ID=opendex-corporate
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key
STACK_SECRET_SERVER_KEY=your_secret_key

# Base de datos
STACK_DATABASE_CONNECTION_STRING=postgresql://user:pass@localhost:5432/opendex_corporate

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
```

### 3. Inicializar Base de Datos

```bash
# Iniciar dependencias
pnpm restart-deps

# Inicializar base de datos
pnpm db:init

# Ejecutar migraciones
pnpm db:migrate

# Sembrar datos iniciales
pnpm db:seed
```

### 4. Iniciar Servicios

```bash
# Desarrollo completo
pnpm dev

# Desarrollo básico (recursos limitados)
pnpm dev:basic
```

**URLs de desarrollo:**
- 🌐 **Aplicación**: http://localhost:3000
- 📊 **Dashboard**: http://localhost:8101
- 🔌 **API**: http://localhost:8102
- 🗄️ **Prisma Studio**: http://localhost:8106

---

## ⚙️ Configuración Avanzada

### 🔐 Configuración de Seguridad

```typescript
// opendex-security-config.ts
export const securityConfig = {
  // Políticas de contraseña
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    preventReuse: 5,
    maxAge: 90, // días
  },
  
  // Configuración de sesiones
  sessionConfig: {
    timeout: 8, // horas
    maxConcurrent: 3,
    requireMFA: true,
  },
  
  // Rate limiting
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 100,
    burstLimit: 200,
  },
  
  // Auditoría
  auditLogging: {
    enabled: true,
    retentionDays: 2555, // 7 años
    events: [
      'user.login',
      'user.logout',
      'user.created',
      'user.updated',
      'user.deleted',
      'permission.granted',
      'permission.revoked',
    ],
  },
};
```

### 👥 Configuración de Equipos

```typescript
// opendex-teams-config.ts
export const teamsConfig = {
  // Estructura organizacional
  organizationalStructure: {
    executive: {
      name: 'Ejecutivo',
      permissions: ['all'],
      color: '#D32F2F',
    },
    engineering: {
      name: 'Ingeniería',
      permissions: ['users:read', 'teams:read', 'analytics:read'],
      color: '#1976D2',
    },
    marketing: {
      name: 'Marketing',
      permissions: ['users:read', 'analytics:read'],
      color: '#7B1FA2',
    },
    sales: {
      name: 'Ventas',
      permissions: ['users:read', 'analytics:read'],
      color: '#F57C00',
    },
    support: {
      name: 'Soporte',
      permissions: ['users:read', 'users:write'],
      color: '#388E3C',
    },
    hr: {
      name: 'Recursos Humanos',
      permissions: ['users:read', 'users:write', 'teams:read'],
      color: '#5D4037',
    },
  },
  
  // Configuración de invitaciones
  invitations: {
    requireApproval: true,
    expirationDays: 7,
    maxPendingInvitations: 50,
  },
};
```

### 📧 Configuración de Emails

```typescript
// opendex-email-config.ts
export const emailConfig = {
  // Configuración SMTP
  smtp: {
    host: 'smtp.opendex.com',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@opendex.com',
      pass: process.env.SMTP_PASSWORD,
    },
  },
  
  // Plantillas personalizadas
  templates: {
    welcome: {
      subject: 'Bienvenido a Opendex Identity Employee',
      template: 'opendex-welcome',
    },
    verification: {
      subject: 'Verifica tu email - Opendex Corporation',
      template: 'opendex-verification',
    },
    passwordReset: {
      subject: 'Restablecer contraseña - Opendex Corporation',
      template: 'opendex-password-reset',
    },
    teamInvitation: {
      subject: 'Invitación a equipo - Opendex Corporation',
      template: 'opendex-team-invitation',
    },
  },
  
  // Configuración de entrega
  delivery: {
    retryAttempts: 3,
    retryDelay: 30000, // 30 segundos
    trackingEnabled: true,
  },
};
```

---

## 📚 API Reference

### 🔐 Endpoints de Autenticación

#### POST `/api/latest/auth/password/sign-in`
Iniciar sesión con credenciales.

**Request:**
```json
{
  "email": "usuario@opendex.com",
  "password": "contraseña_segura",
  "rememberMe": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "usuario@opendex.com",
    "displayName": "Juan Pérez",
    "teams": ["engineering", "executive"]
  },
  "session": {
    "id": "session_456",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### POST `/api/latest/auth/oauth/authorize`
Autorizar con proveedor OAuth.

**Request:**
```json
{
  "provider": "google",
  "redirectUri": "https://app.opendex.com/auth/callback"
}
```

**Response:**
```json
{
  "authorizationUrl": "https://accounts.google.com/oauth/authorize?...",
  "state": "random_state_string"
}
```

### 👥 Endpoints de Gestión de Usuarios

#### GET `/api/latest/users`
Listar usuarios con filtros y paginación.

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20, max: 100)
- `team`: Filtrar por equipo
- `role`: Filtrar por rol
- `search`: Búsqueda por nombre o email

**Response:**
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "usuario@opendex.com",
      "displayName": "Juan Pérez",
      "teams": ["engineering"],
      "roles": ["developer"],
      "lastSignInAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### POST `/api/latest/users`
Crear nuevo usuario.

**Request:**
```json
{
  "email": "nuevo@opendex.com",
  "displayName": "María García",
  "teamId": "team_engineering",
  "role": "developer",
  "sendInvitation": true
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_456",
    "email": "nuevo@opendex.com",
    "displayName": "María García",
    "status": "pending_invitation"
  },
  "invitation": {
    "id": "invitation_789",
    "expiresAt": "2024-01-22T00:00:00Z"
  }
}
```

### 🏢 Endpoints de Gestión de Equipos

#### GET `/api/latest/teams`
Listar equipos.

**Response:**
```json
{
  "teams": [
    {
      "id": "team_engineering",
      "displayName": "Ingeniería",
      "description": "Equipo de desarrollo e ingeniería",
      "memberCount": 25,
      "owner": {
        "id": "user_123",
        "displayName": "Juan Pérez"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/latest/teams`
Crear nuevo equipo.

**Request:**
```json
{
  "displayName": "Nuevo Equipo",
  "description": "Descripción del equipo",
  "ownerId": "user_123"
}
```

---

## 👤 Guías de Usuario

### 🔑 Para Administradores

#### Configurar Proveedores OAuth

1. **Acceder al Dashboard**
   ```
   https://dashboard.opendex.com
   ```

2. **Ir a Configuración → Proveedores OAuth**

3. **Configurar Google Workspace**
   - Crear proyecto en [Google Cloud Console](https://console.cloud.google.com)
   - Habilitar Google+ API
   - Crear credenciales OAuth 2.0
   - Configurar redirect URI: `https://api.opendex.com/api/latest/auth/oauth/callback/google`

4. **Configurar Microsoft 365**
   - Registrar aplicación en [Azure Portal](https://portal.azure.com)
   - Configurar redirect URI: `https://api.opendex.com/api/latest/auth/oauth/callback/microsoft`

#### Gestionar Usuarios

```bash
# Crear usuario via CLI
opendex-cli users create \
  --email "usuario@opendex.com" \
  --display-name "Juan Pérez" \
  --team "engineering" \
  --role "developer"

# Listar usuarios
opendex-cli users list --team engineering --format json

# Suspender usuario
opendex-cli users suspend --user-id user_123 --reason "Violación de políticas"
```

#### Configurar Políticas de Seguridad

```typescript
// config/security-policies.ts
export const securityPolicies = {
  // Política de contraseñas
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    preventReuse: 5,
    maxAge: 90,
  },
  
  // Política de sesiones
  sessionPolicy: {
    timeout: 8, // horas
    maxConcurrent: 3,
    requireMFA: true,
  },
  
  // Política de MFA
  mfaPolicy: {
    required: true,
    methods: ['totp', 'sms', 'passkey'],
    backupCodes: 10,
  },
};
```

### 👥 Para Usuarios Finales

#### Configurar Autenticación de Dos Factores

1. **Acceder a Configuración de Cuenta**
   ```
   https://app.opendex.com/account/settings
   ```

2. **Ir a Seguridad → Autenticación de Dos Factores**

3. **Configurar TOTP (Google Authenticator)**
   - Escanear código QR
   - Ingresar código de verificación
   - Guardar códigos de respaldo

4. **Configurar Passkey**
   - Hacer clic en "Agregar Passkey"
   - Seguir instrucciones del navegador
   - Confirmar con biometría o PIN

#### Gestionar Equipos

1. **Ver Equipos**
   - Ir a "Mis Equipos"
   - Ver equipos activos y roles

2. **Cambiar de Equipo**
   - Usar selector de equipo en la barra superior
   - Cambiar contexto de trabajo

3. **Invitar Miembros**
   - Ir a "Gestionar Equipo"
   - Hacer clic en "Invitar Miembro"
   - Ingresar email y rol

---

## 🔒 Seguridad y Compliance

### 🛡️ Medidas de Seguridad Implementadas

| Categoría | Implementación | Estado |
|-----------|----------------|--------|
| **Autenticación** | MFA obligatorio, Passkeys, OAuth 2.0 | ✅ Activo |
| **Autorización** | RBAC granular, permisos específicos | ✅ Activo |
| **Encriptación** | TLS 1.3, AES-256, bcrypt | ✅ Activo |
| **Auditoría** | Logs completos, retención 7 años | ✅ Activo |
| **Rate Limiting** | Protección DDoS, límites por usuario | ✅ Activo |
| **Backup** | Backup automático diario, cifrado | ✅ Activo |

### 📋 Compliance y Regulaciones

#### GDPR (General Data Protection Regulation)

```typescript
// config/gdpr-compliance.ts
export const gdprConfig = {
  // Derecho al olvido
  dataRetention: {
    userData: 2555, // 7 años
    auditLogs: 2555, // 7 años
    sessionData: 30, // 30 días
  },
  
  // Consentimiento
  consentManagement: {
    required: true,
    granular: true,
    withdrawable: true,
  },
  
  // Portabilidad de datos
  dataPortability: {
    enabled: true,
    formats: ['json', 'csv'],
    automated: true,
  },
  
  // Notificación de brechas
  breachNotification: {
    enabled: true,
    timeLimit: 72, // horas
    authorities: ['DPA'],
  },
};
```

#### SOC 2 Type II

- **Seguridad**: Controles de acceso, encriptación, monitoreo
- **Disponibilidad**: Uptime 99.9%, backup y recuperación
- **Procesamiento**: Integridad de datos, validación
- **Confidencialidad**: Protección de información sensible
- **Privacidad**: Gestión de datos personales

### 🔍 Auditoría y Monitoreo

```typescript
// config/audit-config.ts
export const auditConfig = {
  // Eventos auditados
  events: [
    'user.login',
    'user.logout',
    'user.created',
    'user.updated',
    'user.deleted',
    'permission.granted',
    'permission.revoked',
    'team.created',
    'team.updated',
    'team.deleted',
    'config.changed',
    'security.breach',
  ],
  
  // Retención de logs
  retention: {
    auditLogs: 2555, // 7 años
    accessLogs: 365, // 1 año
    errorLogs: 90, // 3 meses
  },
  
  // Alertas de seguridad
  alerts: {
    failedLogins: {
      threshold: 5,
      timeWindow: 15, // minutos
      action: 'lock_account',
    },
    privilegeEscalation: {
      enabled: true,
      action: 'immediate_alert',
    },
    dataExport: {
      enabled: true,
      action: 'log_and_notify',
    },
  },
};
```

---

## 🔧 Troubleshooting

### ❌ Problemas Comunes

#### Error de Conexión a Base de Datos

**Síntomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución:**
```bash
# Verificar estado de PostgreSQL
sudo systemctl status postgresql

# Iniciar PostgreSQL
sudo systemctl start postgresql

# Verificar conexión
psql -h localhost -U opendex_user -d opendex_corporate

# Verificar configuración
cat .env.local | grep DATABASE
```

#### Error de OAuth

**Síntomas:**
```
Error: Invalid OAuth client configuration
```

**Solución:**
```bash
# Verificar configuración OAuth
curl -X GET "https://api.opendex.com/api/latest/oauth-providers"

# Verificar redirect URIs
# Google: https://api.opendex.com/api/latest/auth/oauth/callback/google
# Microsoft: https://api.opendex.com/api/latest/auth/oauth/callback/microsoft

# Verificar variables de entorno
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
```

#### Error de Email

**Síntomas:**
```
Error: SMTP connection failed
```

**Solución:**
```bash
# Probar conexión SMTP
telnet smtp.opendex.com 587

# Verificar credenciales
echo $STACK_EMAIL_SMTP_USER
echo $STACK_EMAIL_SMTP_PASSWORD

# Verificar logs
tail -f /var/log/mail.log
```

### 🔍 Comandos de Diagnóstico

```bash
# Verificar estado de servicios
systemctl status nginx postgresql redis

# Verificar puertos
netstat -tlnp | grep -E ':(3000|8101|8102|5432|6379)'

# Verificar espacio en disco
df -h
du -sh /var/lib/postgresql/

# Verificar logs de aplicación
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/postgresql/postgresql-14-main.log

# Verificar configuración
opendex-cli config validate
opendex-cli health check
```

### 📊 Monitoreo de Rendimiento

```bash
# Métricas de sistema
htop
iotop
nethogs

# Métricas de base de datos
psql -c "SELECT * FROM pg_stat_activity;"
psql -c "SELECT * FROM pg_stat_database;"

# Métricas de aplicación
curl -s https://api.opendex.com/api/latest/health | jq
curl -s https://api.opendex.com/api/latest/metrics | jq
```

---

## 🤝 Contribución

### 🛠️ Configuración de Desarrollo

```bash
# Fork del repositorio
git clone https://github.com/tu-usuario/opendex-identity-employee.git
cd opendex-identity-employee

# Instalar dependencias
pnpm install

# Configurar pre-commit hooks
pnpm prepare

# Ejecutar tests
pnpm test

# Linting
pnpm lint

# Type checking
pnpm typecheck
```

### 📝 Guía de Contribución

1. **Crear Issue**: Describir el problema o feature request
2. **Fork Repository**: Crear fork del repositorio
3. **Crear Branch**: `git checkout -b feature/nueva-funcionalidad`
4. **Desarrollar**: Implementar cambios con tests
5. **Commit**: `git commit -m "feat: agregar nueva funcionalidad"`
6. **Push**: `git push origin feature/nueva-funcionalidad`
7. **Pull Request**: Crear PR con descripción detallada

### 🧪 Testing

```bash
# Tests unitarios
pnpm test:unit

# Tests de integración
pnpm test:integration

# Tests E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### 📋 Estándares de Código

- **TypeScript**: Tipado estricto, interfaces claras
- **ESLint**: Configuración empresarial
- **Prettier**: Formateo consistente
- **Conventional Commits**: Mensajes de commit estandarizados
- **JSDoc**: Documentación de funciones

---

## 📞 Soporte

### 🆘 Canales de Soporte

| Canal | Disponibilidad | Tiempo de Respuesta |
|-------|----------------|-------------------|
| **Email** | 24/7 | < 4 horas |
| **Slack** | Lunes-Viernes 9AM-6PM EST | < 1 hora |
| **Teléfono** | Lunes-Viernes 9AM-6PM EST | Inmediato |
| **GitHub Issues** | 24/7 | < 24 horas |

### 📧 Contacto

- **Soporte General**: support@opendex.com
- **Soporte Técnico**: tech-support@opendex.com
- **Seguridad**: security@opendex.com
- **Emergencias**: +1 (555) 123-4567

### 📚 Recursos Adicionales

- **Documentación**: https://docs.opendex.com/identity-employee
- **API Docs**: https://api.opendex.com/docs
- **Status Page**: https://status.opendex.com
- **Blog**: https://blog.opendex.com
- **Training**: https://training.opendex.com

### 🎓 Capacitación

- **Webinars**: Sesiones mensuales de capacitación
- **Documentación**: Guías paso a paso
- **Videos**: Tutoriales en video
- **Certificación**: Programa de certificación Opendex

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- **Stack Auth Team**: Por la plataforma base open-source
- **Opendex Corporation**: Por el apoyo y recursos
- **Comunidad**: Por las contribuciones y feedback

---

**© 2024 Opendex Corporation. Todos los derechos reservados.**

*Opendex Identity Employee - Sistema de Gestión de Identidad de Empleados Corporativo*
