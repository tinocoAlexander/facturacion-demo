# Sistema de Facturación NestJS

[![Continuous Integration](https://github.com/tinocoAlexander/facturacion-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/tinocoAlexander/facturacion-demo/actions/workflows/ci.yml)

Un backend robusto en NestJS para la gestión de facturación electrónica, construido con un enfoque en seguridad, diseño multitenant (multi-empresa) y alta disponibilidad.

## Descripción del Sistema
Este sistema permite la ingesta, validación y gestión de tickets, integrando catálogos del SAT para la eventual emisión de CFDI. Soporta múltiples empresas concurrentes en la misma base de datos, proporcionando un entorno seguro mediante políticas de Control de Acceso Basado en Roles (RBAC) y `TenantGuard`.

## Arquitectura
La aplicación utiliza Arquitectura Hexagonal y Domain-Driven Design (DDD):
- **Capa HTTP**: Controladores, Guards (JWT, Roles, Tenant) y Validaciones mediante Joi y `class-validator`.
- **Capa de Dominio**: Servicios e interfaces con tipos inmutables TypeScript y lógica de negocio pura.
- **Capa de Datos**: Repositorios inyectables que centralizan todo el acceso a la base de datos.

## Seguridad
El sistema implementa medidas de endurecimiento de grado de producción:
- **Detección de Reúso de Refresh Tokens**: Protección automática contra ataques de replay de sesión.
- **Invalidación Reactiva (Redis Pub/Sub)**: Purgado instantáneo de sesiones al desactivar usuarios o cambiar empresas.
- **Cálculo Server-Side de Montos**: Los totales de tickets se recalculan autoritativamente en el servidor para evitar fraude o errores de redondeo fiscal.
- **Cifrado AES-256-GCM con Versionado**: Soporte para rotación de llaves maestras sin pérdida de datos históricos.
- **RS256 en Producción**: Uso obligatorio de claves asimétricas para la firma de JWT.

## Estrategia de Migraciones
- **Docker / Docker Compose**: Se utiliza un `ENTRYPOINT` personalizado (`docker-entrypoint.sh`). Si `RUN_MIGRATIONS=true`, el contenedor esperará a la DB y ejecutará migraciones antes de iniciar la app.
- **Producción**: Se recomienda usar Init Containers o Jobs dedicados.

## Operaciones
Para procedimientos detallados de mantenimiento y respuesta ante incidentes, consulte el [RUNBOOK.md](./docs/RUNBOOK.md). Incluye:
- Procedimiento de rotación de llaves CSD.
- Guía para desactivar cuentas comprometidas.
- Identificación de ataques en logs de auditoría.

## Decisiones de Arquitectura (ADR)
- [005: Cálculo Server-Side de Montos](./docs/decisions/005-server-side-amount-calculation.md)
- [006: Contexto con AsyncLocalStorage](./docs/decisions/006-async-local-storage-correlation.md)
- [007: CSD Key Versioning](./docs/decisions/007-csd-key-versioning.md)
- [Ver todas las decisiones...](./docs/decisions/)

## Setup de Desarrollo
1. `npm ci`
2. `cp .env.example .env`
3. `docker compose --profile dev up -d`
4. `npm run start:dev`

## Roles del Sistema
- `admin`: Administración total de la empresa.
- `contador`: Acceso a reportes y resúmenes.
- `cajero`: Ingesta masiva y creación de tickets.
- `user`: Rol de sistema base.
