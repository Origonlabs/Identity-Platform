# Microservices dev compose

Levanta las nuevas APIs desacopladas con sus propias bases de datos Postgres.

## Uso

```bash
docker compose -f docker/services/docker.compose.yaml up --build
```

Servicios expuestos:
- Notifications service: http://localhost:8201/v1/health (DB en puerto 5434)
- OAuth connections service: http://localhost:8202/v1/health (DB en puerto 5435)

Cada servicio monta su propia base de datos para mantener el aislamiento de datos en desarrollo.
