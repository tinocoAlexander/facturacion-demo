# Runbook Operacional

Guía de procedimientos estándar para el mantenimiento y respuesta ante incidentes del sistema de facturación.

## 1. Rotación de Llave de Cifrado de CSDs

Cuando necesites rotar la `CSD_ENCRYPTION_KEY`:

1.  **Generar nueva llave**: Crea una llave de 32 bytes (64 chars hex).
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
2.  **Configurar**: Añade la nueva llave al entorno conservando la anterior.
    - Mantén `CSD_ENCRYPTION_KEY_v1`
    - Añade `CSD_ENCRYPTION_KEY_v2` con el nuevo valor.
3.  **Reiniciar**: Reinicia los pods/contenedores. Los nuevos CSDs se cifrarán con la v2.
4.  **Migrar Datos (Opcional)**: Ejecuta el script de rotación para actualizar registros antiguos:
    ```bash
    npm run scripts:rotate-csd-key -- --to-version 2
    ```
5.  **Limpiar**: Una vez verificado que no quedan registros con `key_version = 1`, puedes eliminar `CSD_ENCRYPTION_KEY_v1` del entorno.

## 2. Desactivación de Cuenta Comprometida

Si detectas actividad sospechosa en un usuario:

1.  **Marcar como inactivo**: Cambia el estado del usuario en la base de datos o vía API.
2.  **Invalidación automática**:
    - **Si Redis está activo**: El caché de sesión se purgará **instantáneamente** en todos los nodos del cluster.
    - **Si Redis NO está activo**: El usuario seguirá teniendo acceso durante máximo **30 segundos** (TTL del caché local).
3.  **Revocación de Refresh Tokens**: El sistema detectará automáticamente si intentan usar un token antiguo y revocará todas las sesiones activas de ese usuario.

## 3. Identificación de Token Reuse (Ataque de Replay)

Busca en los logs de auditoría (`audit_logs`) o en los logs de la aplicación:

- **Evento**: `AUTH_SESSION_REVOKED`
- **Mensaje**: `Detectada posible reutilización de Refresh Token`
- **Qué buscar**: Busca múltiples entradas para el mismo `actorUserId` con el código `TOKEN_REUSE_DETECTED`. Esto indica que alguien robó un refresh token e intentó usarlo después de que el usuario legítimo ya lo había rotado.

## 4. Escalamiento de Base de Datos (Postgres)

Si el sistema presenta lentitud en horas pico:

- **Conexiones**: El pool por defecto es 20. Puedes aumentarlo con `DB_POOL_MAX`.
- **Límites Recomendados**:
  - Small (1-2 vCPU): `DB_POOL_MAX=20`, `DB_STATEMENT_TIMEOUT_MS=15000`.
  - Medium (4 vCPU): `DB_POOL_MAX=50`, `DB_STATEMENT_TIMEOUT_MS=30000`.
- **Memoria**: Asegúrate de que el límite del contenedor Docker (`mem_limit`) sea al menos 2x el tamaño de `shared_buffers` configurado en Postgres.

## 5. Verificación de Migraciones

Para asegurar que el esquema está actualizado en un entorno de staging/prod:

1.  **Revisar logs de arranque**: Busca "Migraciones completadas exitosamente".
2.  **Consultar DB**:
    ```sql
    SELECT * FROM migrations_history ORDER BY applied_at DESC LIMIT 5;
    ```
3.  **Forzar ejecución**: Si el contenedor no arranca por falta de permisos, ejecuta manualmente:
    ```bash
    npm run db:migrate:prod
    ```
