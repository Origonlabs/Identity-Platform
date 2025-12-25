# Guía de Migración - Reorganización de Estructura

## Resumen

Se ha reorganizado la estructura del proyecto para seguir mejores prácticas de arquitectura de software, organizando los paquetes por dominio y responsabilidad.

## Cambios Principales

### Antes
```
packages/
├── security/
├── zero-trust/
├── event-bus/
├── observability/
└── ...
```

### Después
```
packages/
├── core/
│   └── contracts/
├── security/
│   ├── security/
│   ├── zero-trust/
│   ├── threat-intelligence/
│   └── ...
├── identity/
│   ├── decentralized-identity/
│   ├── zero-knowledge/
│   └── ...
├── infrastructure/
│   ├── event-bus/
│   ├── service-client/
│   └── ...
└── ...
```

## Pasos de Migración

### Opción 1: Migración Automática (Recomendada)

```bash
# 1. Hacer backup
git add -A
git commit -m "Backup antes de reorganización"

# 2. Reorganizar estructura
bash scripts/reorganize-structure.sh

# 3. Actualizar imports (requiere revisión manual después)
bash scripts/update-imports.sh

# 4. Actualizar package.json de cada paquete movido
# Cambiar el nombre del paquete de "@opendex/security" a "@opendex/security/security"
# etc.

# 5. Reinstalar dependencias
pnpm install

# 6. Reconstruir
pnpm build:packages

# 7. Verificar que todo funciona
pnpm typecheck
pnpm test run
```

### Opción 2: Migración Manual (Más Control)

1. **Crear nueva estructura de directorios**
   ```bash
   mkdir -p packages/{core,security,identity,infrastructure,observability,compliance,advanced,performance}
   ```

2. **Mover paquetes manualmente**
   - Mover `packages/contracts` → `packages/core/contracts`
   - Mover paquetes de seguridad → `packages/security/`
   - Mover paquetes de identidad → `packages/identity/`
   - etc.

3. **Actualizar `package.json` de cada paquete**
   - Cambiar el nombre del paquete para reflejar nueva ubicación
   - Ejemplo: `"name": "@opendex/security"` → `"name": "@opendex/security/security"`

4. **Actualizar imports en todo el proyecto**
   - Buscar y reemplazar imports antiguos
   - Usar herramientas de refactoring del IDE

5. **Actualizar `pnpm-workspace.yaml`**
   - Ya está actualizado con la nueva estructura

6. **Reinstalar y reconstruir**
   ```bash
   pnpm install
   pnpm build:packages
   ```

## Mapeo de Paquetes

### Core
- `contracts` → `core/contracts`

### Security
- `security` → `security/security`
- `zero-trust` → `security/zero-trust`
- `threat-intelligence` → `security/threat-intelligence`
- `encryption` → `security/encryption`
- `quantum-resistant` → `security/quantum-resistant`
- `behavioral-biometrics` → `security/behavioral-biometrics`
- `continuous-auth` → `security/continuous-auth`
- `ml-auth` → `security/ml-auth`

### Identity
- `decentralized-identity` → `identity/decentralized-identity`
- `zero-knowledge` → `identity/zero-knowledge`
- `session-management` → `identity/session-management`
- `rbac-advanced` → `identity/rbac-advanced`

### Infrastructure
- `event-bus` → `infrastructure/event-bus`
- `service-client` → `infrastructure/service-client`
- `cache` → `infrastructure/cache`
- `rate-limiting` → `infrastructure/rate-limiting`
- `ml-rate-limiting` → `infrastructure/ml-rate-limiting`
- `ddos-protection` → `infrastructure/ddos-protection`

### Observability
- `observability` → `observability/observability`
- `analytics` → `observability/analytics`
- `anomaly-detection` → `observability/anomaly-detection`

### Compliance
- `compliance` → `compliance/compliance`
- `blockchain-audit` → `compliance/blockchain-audit`
- `webhooks` → `compliance/webhooks`

### Advanced
- `homomorphic-encryption` → `advanced/homomorphic-encryption`
- `federated-learning` → `advanced/federated-learning`
- `graphql-api` → `advanced/graphql-api`

### Performance
- `performance` → `performance/performance`
- `multi-region` → `performance/multi-region`
- `self-healing` → `performance/self-healing`

## Actualización de Imports

### Ejemplos de Cambios

```typescript
// Antes
import { RiskScoringEngine } from '@opendex/security';
import { EventBus } from '@opendex/event-bus';

// Después
import { RiskScoringEngine } from '@opendex/security/security';
import { EventBus } from '@opendex/infrastructure/event-bus';
```

## Verificación Post-Migración

Después de la migración, verifica:

1. ✅ Todos los paquetes se construyen correctamente
2. ✅ No hay errores de TypeScript
3. ✅ Los tests pasan
4. ✅ Las aplicaciones se ejecutan correctamente
5. ✅ Los imports están actualizados

## Rollback

Si necesitas revertir los cambios:

```bash
git reset --hard HEAD~1
```

O si ya hiciste commit:

```bash
git revert HEAD
```

## Notas Importantes

- Los paquetes legacy (`stack`, `react`, `js`, `template`) se mantienen en la raíz de `packages/` para compatibilidad
- La migración puede requerir actualización manual de algunos imports
- Revisa todos los `package.json` después de mover paquetes
- Actualiza referencias en documentación si es necesario
