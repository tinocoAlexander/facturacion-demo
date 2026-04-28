# ADR 006: Propagación de Contexto con AsyncLocalStorage

## Estado
Aceptado

## Contexto
Para la observabilidad del sistema, es crítico que cada línea de log esté asociada a un `requestId`. En aplicaciones asíncronas de Node.js, pasar este ID manualmente a través de todos los servicios e interfaces ensucia el código de negocio (prop drilling).

## Decisión
Utilizar `AsyncLocalStorage` (Node.js built-in) para almacenar y propagar el contexto de la petición (`requestId`, `userId`) a través de toda la cadena de ejecución asíncrona.

- **RequestIdMiddleware**: Captura o genera el ID y envuelve la ejecución en `asyncLocalStorage.run()`.
- **AppLogger**: Accede al almacenamiento de forma transparente para inyectar el prefijo `[reqId=...]` en cada log.

## Por qué no otras opciones
- **Zone.js**: Demasiado pesado y orientado a Angular; puede afectar el rendimiento de red en servidores de alta carga.
- **CLS (Continuation Local Storage)**: Obsoleto en favor de la implementación nativa de Node.js.
- **Prop Drilling**: Rechazado por degradar la legibilidad y mantenibilidad de la lógica de negocio.

## Consecuencias
- **Observabilidad**: Depuración instantánea en producción correlacionando logs de múltiples servicios (Audit, Crypto, Tickets).
- **Mantenibilidad**: Los desarrolladores no necesitan preocuparse por pasar el contexto manualmente.
