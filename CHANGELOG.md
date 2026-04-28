# Changelog

Todas las modificaciones notables a este proyecto serán documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-28

### Added
- **Key Versioning para CSDs**: Soporte para rotación de llaves de cifrado AES-256-GCM sin pérdida de acceso a datos históricos.
- **Correlation ID (Propagación de Contexto)**: Implementación de `AsyncLocalStorage` para trazar `requestId` y `userId` en todos los logs de la aplicación.
- **Invalidación de Caché Reactiva**: Uso de Redis Pub/Sub para purgar instantáneamente el caché de sesión de usuarios desactivados o modificados.
- **Estrategia de Despliegue en Docker**: Nuevo `docker-entrypoint.sh` con mecanismo `wait-for-db` y ejecución atómica de migraciones.
- **Suite de Pruebas Unitarias**: Cobertura crítica para `CsdsCryptoService`, `LoginAttemptsService`, `RolesGuard`, `TenantGuard` y `TicketsIngestService`.
- **Adminer**: Servicio opcional en Docker Compose para gestión de base de datos en desarrollo.

### Security
- **Detección de Reúso de Tokens**: Implementada lógica en `AuthSessionService` para revocar sesiones inmediatamente al detectar una rotación de Refresh Token duplicada.
- **Hardenización de JWT**: Migración forzada a **RS256** (claves asimétricas) en producción, prohibiendo el uso de `JWT_SECRET` si existen claves privadas.
- **Prevención de Path Traversal**: Corregida vulnerabilidad en el servicio de backups al sanitizar y resolver rutas contra un directorio base.
- **Throttling de Login**: Mejora en `LoginAttemptsService` con soporte para bloqueo distribuido en Redis y fallback en memoria.

### Changed
- **Cálculo de Montos Server-Side**: El sistema ahora ignora los totales enviados por el cliente en la ingesta de tickets y los recalcula autoritativamente en el servidor para garantizar integridad fiscal.
- **Configuración de TypeScript Estricta**: Activado `"strict": true` en `tsconfig.json` y prohibición de `any` explícito en ESLint.
- **Infraestructura de Contenedores**: Añadidos límites de recursos (CPU/Memoria) y perfiles de ejecución (`dev` profile) en Docker Compose.

### Fixed
- **Memory Leaks en Base de Datos**: Sustitución de `setInterval` incontrolados por `DbMetricsTask` vinculado al ciclo de vida de NestJS (`OnModuleDestroy`).
- **Dependencias Circulares**: Resueltos bloqueos de arranque entre `AuthModule` y `EmpresasModule` usando `forwardRef`.

## [1.0.0] - 2026-04-20
- Lanzamiento inicial con arquitectura hexagonal básica.
