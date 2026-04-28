# Sistema de Facturación NestJS

Un backend robusto en NestJS para la gestión de facturación electrónica, construido con un enfoque en seguridad, diseño multitenant (multi-empresa) y alta disponibilidad.

## Descripción del Sistema
Este sistema permite la ingesta, validación y gestión de tickets, integrando catálogos del SAT para la eventual emisión de CFDI. Soporta múltiples empresas concurrentes en la misma base de datos, proporcionando un entorno seguro mediante políticas de Control de Acceso Basado en Roles (RBAC) y `TenantGuard`.

## Arquitectura
La aplicación utiliza Arquitectura Hexagonal y Domain-Driven Design (DDD):
- **Capa HTTP**: Controladores, Guards (JWT, Roles, Tenant) y Validaciones mediante Joi y `class-validator`.
- **Capa de Dominio**: Servicios e interfaces con tipos inmutables TypeScript y lógica de negocio pura.
- **Capa de Datos**: Repositorios inyectables que centralizan todo el acceso a la base de datos (se aplica una política estricta de cero sentencias SQL dentro de la capa de servicios).

Dependencias principales:
- **PostgreSQL 16**: Base de datos primaria.
- **Redis 7**: Cache centralizado y sistema de throttling (es opcional; la app efectúa *fallback* si no existe).

## Módulos y Responsabilidades
- **AuthModule**: Gestión de JWT (con soporte de claves asimétricas RS256 o simétricas HS256) y protección contra fuerza bruta.
- **EmpresasModule**: Administración del contexto de empresas y validación de entidades legales (RFCs).
- **TicketsModule**: Ingesta masiva y listado de tickets usando validación de esquema, idempotencia concurrente y `unnest()` de Postgres.
- **CatalogosModule**: Sincronización transparente de catálogos oficiales del SAT desde archivos seed de CSV.
- **CsdsModule**: Gestión de sellos y certificados SAT cifrados en reposo (AES-256-GCM con rotación automática de IV).

## Setup de Desarrollo

1. **Instalar dependencias**: 
   ```bash
   npm ci
   ```
2. **Copiar y ajustar configuración**: 
   ```bash
   cp .env.example .env
   ```
   (Asegúrate de llenar las claves de la base de datos y generar tu propia `CSD_ENCRYPTION_KEY`).
3. **Levantar contenedores**: Es necesario que corras PostgreSQL localmente para desarrollar.
4. **Correr migraciones de Base de Datos**: 
   ```bash
   npm run db:migrate
   ```
5. **Iniciar proyecto**: 
   ```bash
   npm run start:dev
   ```

## Variables de Entorno Críticas
- `JWT_SECRET`: Requerida para desarrollos y firmas simétricas. Mínimo de 32 caracteres dictado por Joi.
- `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`: Par RSA para firmas en producción (Recomendado).
- `CSD_ENCRYPTION_KEY`: Master Key de 32 bytes (64 caracteres hex) generada criptográficamente para cifrar certificados. **CRÍTICO:** Nunca uses un valor predecible.
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Credenciales obligatorias.

## Tests
El proyecto cuenta con suites unitarias y un entorno de test `e2e` que emplea *TestContainers* (a través de CI o red local) validando los módulos sin usar *mocks*:
```bash
# Correr entorno End-to-End
npm run test:e2e
```

## Decisiones de Arquitectura
Por favor revisar el directorio de decisiones arquitectónicas (`docs/decisions/`) para entender en detalle los porqués de la implementación.
- [001: UUID para IDs de empresas](./docs/decisions/001-uuid-for-empresas.md)
- [002: JWT RS256 Fallback a HS256](./docs/decisions/002-jwt-rs256-fallback-hs256.md)
- [003: Redis es Opcional (Fallback)](./docs/decisions/003-redis-optional-fallback.md)
- [004: AES-256-GCM para CSD](./docs/decisions/004-aes-256-gcm-for-csd.md)

## Roles del Sistema
El sistema hace distinción estricta de identidades a través de roles controlados por el `RolesGuard`:
- `admin`: Dueño o encargado total de la empresa (puede agregar usuarios, modificar settings y certificados).
- `contador`: Nivel estadístico que accede a reportes y resúmenes tributarios sin capacidad mutacional de la ingesta de transacciones.
- `cajero`: Ingesta masiva y creación de tickets, aislado sin posibilidad de visualizar estadísticas del negocio.
- `user`: Rol de sistema base (sólo consultas perfil).
