# ADR 007: CSD Key Versioning y Rotación

## Estado
Aceptado

## Contexto
Los Certificados de Sello Digital (CSD) se cifran con AES-256-GCM. Si la llave maestra se viera comprometida, sería necesario cambiarla. Sin embargo, en un esquema de llave única, cambiar la llave invalidaría todos los certificados antiguos ya almacenados en la DB.

## Decisión
Implementar un esquema de **Key Versioning**.

- El sistema soporta múltiples llaves en el entorno: `CSD_ENCRYPTION_KEY_v1`, `CSD_ENCRYPTION_KEY_v2`, etc.
- Cada registro en la tabla `csds` tiene una columna `key_version`.
- **Cifrado**: Se utiliza siempre la versión más alta disponible como la llave "activa".
- **Descifrado**: El sistema busca en su mapa interno la llave que corresponde a la `key_version` guardada en el registro.

## Consecuencias
- **Resiliencia**: Permite rotar llaves sin tiempo de inactividad.
- **Seguridad**: Facilita el cumplimiento de políticas de rotación periódica.
- **Operaciones**: Se requiere un script de mantenimiento para re-cifrar registros antiguos con la nueva llave si se desea descartar la versión anterior totalmente.
