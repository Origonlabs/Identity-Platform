# Arquitectura del Proyecto - Atlas Identity Platform

## Estructura de Directorios

```
Identity-Platform/
├── apps/                          # Aplicaciones y servicios
│   ├── api-gateway/              # API Gateway principal
│   ├── backend/                   # Backend principal (Next.js)
│   ├── dashboard/                 # Dashboard administrativo
│   ├── monitoring-dashboard/      # Dashboard de monitoreo
│   ├── notifications-service/     # Microservicio de notificaciones
│   ├── oauth-connections-service/ # Microservicio de conexiones OAuth
│   └── dev-launchpad/             # Portal de desarrollo
│
├── packages/                      # Paquetes compartidos
│   ├── core/                     # Núcleo del sistema
│   │   ├── contracts/            # Contratos de eventos y tipos
│   │   ├── types/                # Tipos TypeScript compartidos
│   │   └── utils/                # Utilidades generales
│   │
│   ├── security/                 # Seguridad y autenticación
│   │   ├── security/             # Risk scoring, fraud detection
│   │   ├── zero-trust/           # Zero-trust architecture
│   │   ├── threat-intelligence/  # Threat intelligence
│   │   ├── encryption/           # Encryption y key management
│   │   ├── quantum-resistant/    # Quantum-resistant crypto
│   │   ├── behavioral-biometrics/# Behavioral biometrics
│   │   ├── continuous-auth/      # Continuous authentication
│   │   └── ml-auth/               # ML-based authentication
│   │
│   ├── identity/                 # Gestión de identidad
│   │   ├── decentralized-identity/ # DID/Verifiable Credentials
│   │   ├── zero-knowledge/       # Zero-knowledge proofs
│   │   ├── session-management/   # Session management
│   │   └── rbac-advanced/        # RBAC/ABAC avanzado
│   │
│   ├── infrastructure/           # Infraestructura y comunicación
│   │   ├── event-bus/            # Event bus (NATS)
│   │   ├── service-client/       # HTTP client con resilience
│   │   ├── cache/                # Distributed caching
│   │   ├── rate-limiting/        # Rate limiting básico
│   │   ├── ml-rate-limiting/    # ML-based rate limiting
│   │   └── ddos-protection/     # DDoS protection
│   │
│   ├── observability/           # Observabilidad
│   │   ├── observability/       # OpenTelemetry, logging
│   │   ├── analytics/           # Analytics y reporting
│   │   └── anomaly-detection/   # Anomaly detection
│   │
│   ├── compliance/              # Compliance y gobernanza
│   │   ├── compliance/          # GDPR, SOC2
│   │   ├── blockchain-audit/    # Blockchain audit trail
│   │   └── webhooks/            # Webhook system
│   │
│   ├── advanced/               # Características avanzadas
│   │   ├── homomorphic-encryption/ # Homomorphic encryption
│   │   ├── federated-learning/  # Federated learning
│   │   └── graphql-api/        # GraphQL API layer
│   │
│   └── performance/            # Performance y escalabilidad
│       ├── performance/        # Query optimization, batching
│       ├── multi-region/       # Multi-region support
│       └── self-healing/       # Self-healing system
│
├── configs/                     # Configuraciones compartidas
│   ├── eslint/                 # ESLint configs
│   └── tsup/                   # Build configs
│
├── docker/                     # Docker y orquestación
│   ├── dependencies/           # Servicios de dependencias
│   ├── emulator/              # Emuladores
│   └── server/                # Configuración del servidor
│
├── kubernetes/                # Kubernetes manifests
│   └── helm/                  # Helm charts
│
├── scripts/                   # Scripts de utilidad
├── docs/                      # Documentación
└── examples/                  # Ejemplos de uso

```

## Principios de Organización

### 1. Separación por Dominio
- **core/**: Funcionalidad fundamental compartida
- **security/**: Todo lo relacionado con seguridad
- **identity/**: Gestión de identidad y autenticación
- **infrastructure/**: Comunicación y servicios base
- **observability/**: Monitoreo y análisis
- **compliance/**: Cumplimiento normativo
- **advanced/**: Características innovadoras
- **performance/**: Optimización y escalabilidad

### 2. Convenciones de Nomenclatura
- **kebab-case** para nombres de carpetas y archivos
- **PascalCase** para clases y tipos
- **camelCase** para funciones y variables
- Prefijos descriptivos para paquetes (`@opendex/`)

### 3. Estructura Interna de Paquetes
```
package-name/
├── src/
│   ├── index.ts              # Public API
│   ├── types.ts              # TypeScript types
│   ├── [feature].ts          # Implementaciones
│   └── __tests__/           # Tests
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

### 4. Estructura Interna de Servicios
```
service-name/
├── src/
│   ├── main.ts              # Entry point
│   ├── modules/             # Módulos NestJS
│   │   ├── [domain]/
│   │   │   ├── [domain].module.ts
│   │   │   ├── [domain].service.ts
│   │   │   ├── [domain].controller.ts
│   │   │   ├── dto/
│   │   │   └── entities/
│   │   └── ...
│   ├── config/              # Configuraciones
│   └── prisma/              # Prisma schema y client
├── prisma/
│   └── schema.prisma
├── package.json
└── tsconfig.json
```

## Reglas de Dependencias

1. **packages/core/** → No depende de otros paquetes internos
2. **packages/security/** → Puede depender de core
3. **packages/identity/** → Puede depender de core y security
4. **packages/infrastructure/** → Puede depender de core
5. **packages/observability/** → Puede depender de core
6. **packages/compliance/** → Puede depender de core, security, identity
7. **packages/advanced/** → Puede depender de cualquier paquete base
8. **packages/performance/** → Puede depender de core e infrastructure
9. **apps/** → Pueden depender de cualquier paquete

## Mejores Prácticas

1. **Single Responsibility**: Cada paquete tiene una responsabilidad clara
2. **Dependency Inversion**: Depender de abstracciones, no implementaciones
3. **Open/Closed**: Abierto para extensión, cerrado para modificación
4. **Interface Segregation**: Interfaces pequeñas y específicas
5. **DRY**: No repetir código, usar paquetes compartidos
