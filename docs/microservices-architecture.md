# Microservices Architecture Plan (Atlas Identity Platform)

## Objetivos
- Desacoplar dominios críticos (authn, authz, organizaciones, OAuth 3P, notificaciones) con límites de datos claros.
- Contratos estables (REST+OpenAPI, eventos tipados) y SDKs generados desde contratos (sin imports internos).
- Seguridad de nivel enterprise: emisor único de tokens, mTLS/service mesh, rate limiting per-ruta, rotación de claves y revocación.
- Observabilidad de primer nivel: trazas, métricas, logs correlacionados, SLOs y caos controlado.

## Servicios propuestos y ownership de datos
- `authn-sessions`: login/passkeys/MFA, emisión JWKS, rotación de claves, revocación y M2M. Datos: sesiones, claves, devices, MFA.
- `authz-policies`: RBAC/ABAC (policy engine OPA/Cedar-like), permisos por proyecto/tenant. Datos: roles, políticas, assignments.
- `identity-profiles`: usuarios base, emails, phone, atributos básicos; sin tokens. Datos: perfiles, verificaciones.
- `orgs-teams`: organizaciones, equipos, invitaciones, membresías, ownership de jerarquía multi-tenant.
- `oauth-connections`: conexiones OAuth 3P, tokens y refresh, scope vault, rotated secrets.
- `notifications`: emails/SMS/webhooks; plantillas, schedule y entrega. Publica eventos de entrega; consume eventos de dominio.
- `audit-analytics`: event store inmutable, vistas derivadas, consultas agregadas. Apoyo a replay.
- `admin-bff`: dashboard (Next.js actual), compone servicios.
- `public-gateway/bff`: expone API pública, rate limiting y agregación; proxy a servicios internos vía mTLS.

## Contratos y comunicación
- REST JSON versionado (`/v1/<service>/...`) con OpenAPI por servicio; paquete `packages/contracts` (a crear) con DTOs y esquemas de eventos.
- Eventos en bus (NATS/Kafka/Redpanda). Patrón outbox por servicio, consumidores idempotentes. Versionado de eventos y DLQ.
- SDKs (`packages/stack`, `packages/react`, `packages/js`) consumen únicamente contratos publicados. Contratos compartidos en `packages/stack-shared` o nuevo `packages/contracts`.

## Seguridad
- Emisor JWT único (`authn-sessions`); JWKS público, rotación automática, revocación por jti/kid. Claims mínimos + scopes.
- mTLS entre servicios (service mesh: Linkerd/Istio). Validación de scopes en cada servicio, no confiar en gateway.
- Secrets en KMS/Vault. M2M tokens cortos para tráfico interno. Auditoría de todas las acciones administrativas.

## Datos y consistencia
- Cada servicio con su esquema Prisma aislado; sin DB compartida. Migraciones por servicio.
- Consistencia eventual con eventos + proyecciones. Para consultas compuestas, usar BFF o vistas derivadas en `audit-analytics`.
- Outbox + transacciones para publicar eventos; reintentos idempotentes en consumidores.

## Observabilidad y fiabilidad
- OpenTelemetry en todos los servicios; logs estructurados con `trace_id` y `span_id`. Métricas Prometheus, dashboards Grafana.
- SLOs por servicio (p99 latency, error rate) y alertas.
- Pruebas de caos controlado (latencia/errores) en staging; circuit breakers y retries con backoff.

## Entorno de desarrollo
- Docker Compose: gateway + bus + postgres por servicio + authn/authz/notifications/oauth-connections mínimos.
- Scripts `pnpm dev:<service>` y `pnpm test run <service>`; seeds por servicio.
- Helm charts por servicio en `kubernetes/helm/<service>`; valores compartidos para observabilidad/mesh.

## Fases de migración propuestas
- Fase 0: Contratos base (OpenAPI + eventos) y gateway mínimo. Centralizar emisión/validación de JWT en `authn-sessions` (reutilizar `apps/auth-service`).
- Fase 1: Extraer `notifications` (emails/Svix) y `oauth-connections` desde `apps/backend`. Cada uno con su Prisma, outbox y health checks. BFF consume vía HTTP + eventos.
- Fase 2: Extraer `orgs-teams` e `identity-profiles`; BFF compone. Sustituir llamadas internas por clientes generados.
- Fase 3: `audit-analytics` con event store append-only y vistas derivadas. Añadir replay y retención.
- Fase 4: Endurecer seguridad (rotación automática de claves, revocación, rate limiting granular), resiliencia (circuit breakers) y SLOs con alertas.
- Fase 5: Performance/chaos, canary/blue-green desde gateway, contract tests consumidor-productor para cada cliente SDK.

## Primeros entregables sugeridos
- Crear `packages/contracts` con DTOs y esquemas de eventos para `notifications` y `oauth-connections`.
- Promover `apps/backend` a `public-gateway/bff` (solo orquestación) y enrutar a `authn-sessions` existente para validación.
- Definir chart Helm base y plantillas de health/readiness para nuevos servicios.
