# Estructura del Proyecto - Atlas Identity Platform

## 📁 Organización de Directorios

Este proyecto sigue una arquitectura de monorepo organizada por dominios y responsabilidades.

### Estructura Principal

```
Identity-Platform/
├── apps/                    # Aplicaciones y microservicios
├── packages/                # Paquetes compartidos organizados por dominio
│   ├── core/               # Núcleo del sistema
│   ├── security/            # Seguridad y autenticación
│   ├── identity/            # Gestión de identidad
│   ├── infrastructure/      # Infraestructura y comunicación
│   ├── observability/      # Observabilidad y monitoreo
│   ├── compliance/          # Compliance y gobernanza
│   ├── advanced/           # Características avanzadas
│   └── performance/        # Performance y escalabilidad
├── configs/                 # Configuraciones compartidas
├── docker/                  # Docker y orquestación
├── kubernetes/             # Kubernetes manifests
├── scripts/                # Scripts de utilidad
└── docs/                   # Documentación
```

## 🎯 Principios de Organización

### 1. Separación por Dominio
Los paquetes están organizados por dominio de negocio y responsabilidad técnica:

- **Core**: Funcionalidad fundamental sin dependencias internas
- **Security**: Todo lo relacionado con seguridad
- **Identity**: Gestión de identidad y autenticación
- **Infrastructure**: Comunicación y servicios base
- **Observability**: Monitoreo y análisis
- **Compliance**: Cumplimiento normativo
- **Advanced**: Características innovadoras
- **Performance**: Optimización y escalabilidad

### 2. Reglas de Dependencias

```
Core → (sin dependencias internas)
Security → Core
Identity → Core, Security
Infrastructure → Core
Observability → Core
Compliance → Core, Security, Identity
Advanced → Cualquier paquete base
Performance → Core, Infrastructure
Apps → Cualquier paquete
```

### 3. Convenciones de Nomenclatura

- **Carpetas**: `kebab-case` (ej: `zero-knowledge`, `event-bus`)
- **Archivos**: `kebab-case.ts` (ej: `risk-scoring.ts`)
- **Clases**: `PascalCase` (ej: `RiskScoringEngine`)
- **Funciones**: `camelCase` (ej: `calculateRisk`)
- **Constantes**: `UPPER_SNAKE_CASE` (ej: `MAX_RETRIES`)

## 📦 Estructura de Paquetes

Cada paquete sigue esta estructura estándar:

```
package-name/
├── src/
│   ├── index.ts              # Public API (barrel export)
│   ├── types.ts              # TypeScript types/interfaces
│   ├── [feature].ts         # Implementaciones
│   └── __tests__/           # Tests
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 🏗️ Estructura de Servicios

Cada servicio (app) sigue esta estructura:

```
service-name/
├── src/
│   ├── main.ts              # Entry point
│   ├── modules/             # Módulos NestJS
│   │   └── [domain]/
│   │       ├── [domain].module.ts
│   │       ├── [domain].service.ts
│   │       ├── [domain].controller.ts
│   │       ├── dto/         # Data Transfer Objects
│   │       └── entities/   # Entidades
│   ├── config/              # Configuraciones
│   └── prisma/              # Prisma client
├── prisma/
│   └── schema.prisma
└── package.json
```

## 🔄 Reorganización

Para reorganizar la estructura existente:

```bash
# 1. Reorganizar paquetes
bash scripts/reorganize-structure.sh

# 2. Actualizar imports (después de reorganizar)
bash scripts/update-imports.sh

# 3. Reinstalar dependencias
pnpm install

# 4. Reconstruir
pnpm build:packages
```

## 📚 Documentación Adicional

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura detallada
- [.structure-rules.md](./.structure-rules.md) - Reglas de estructura

## ✅ Checklist para Nuevos Paquetes

Al crear un nuevo paquete, asegúrate de:

- [ ] Colocarlo en el directorio correcto según su dominio
- [ ] Seguir la estructura estándar de paquetes
- [ ] Definir dependencias correctamente en `package.json`
- [ ] Exportar API pública en `src/index.ts`
- [ ] Agregar tipos en `src/types.ts`
- [ ] Incluir tests en `src/__tests__/`
- [ ] Actualizar `pnpm-workspace.yaml` si es necesario
- [ ] Documentar el propósito del paquete
