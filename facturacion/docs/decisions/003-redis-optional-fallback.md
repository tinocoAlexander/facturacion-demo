# Redis es opcional con fallback a memoria/DB

## Decisión
Redis mejora rendimiento pero no es un single point of failure.
Si REDIS_URL no está configurada:
- LoginAttemptsService: fallback a Map en memoria
- CatalogosService: cada request va a Postgres
- TicketsQueryService: stats sin cache

## Consecuencias
Mayor latencia sin Redis. Aceptable en desarrollo y en deploys simples.
