# RS256 en producción, HS256 en desarrollo

## Contexto
JWT puede firmarse con algoritmo simétrico (HS256) o asimétrico (RS256).

## Decisión
Si JWT_PRIVATE_KEY está configurada → RS256. Si no → HS256.
En producción JWT_PRIVATE_KEY es requerida por Joi.

## Consecuencias
Los servicios consumidores pueden verificar tokens sin la private key (solo necesitan public key).
Rotación de keys sin invalidar todos los tokens activos.
