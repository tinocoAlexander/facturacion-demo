<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Sistema de facturación progresivo desarrollado con [Nest](https://github.com/nestjs/nest).

## Development

Para correr el proyecto en desarrollo, primero asegúrate de tener levantada la infraestructura necesaria:

1. **Infraestructura**:
   ```bash
   # Ir al directorio de contenedores y levantar DB y Redis
   $ cd ../contenedores
   $ docker-compose up -d
   ```

2. **Aplicación**:
   ```bash
   # Instalar dependencias
   $ npm install
   
   # Correr en modo desarrollo (watch mode)
   $ npm run start:dev
   ```

## Production Build

### Docker (Recomendado)
El proyecto utiliza un `Dockerfile` multi-stage para generar una imagen ligera y segura:

```bash
# Generar la imagen de producción
$ docker build -t facturacion-api .

# Correr el contenedor (asegúrate de pasar las variables de entorno)
$ docker run -p 3000:3000 --env-file .env facturacion-api
```

### Build Manual
```bash
$ npm run build
$ npm run start:prod
```

## Environment Variables

El proyecto utiliza un esquema de validación estricto con Joi. Las variables principales son:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto de la aplicación | 3000 |
| `DB_HOST` | Host de PostgreSQL | localhost |
| `DB_USER` | Usuario de PostgreSQL | (requerido) |
| `DB_PASSWORD` | Contraseña de PostgreSQL | (requerido) |
| `JWT_SECRET` | Secreto JWT (mín 32 chars) | (requerido) |
| `REDIS_URL` | URL de Redis | (opcional) |
| `REDIS_PASSWORD` | Contraseña de Redis | (opcional) |
| `CLEANUP_CRON` | Cron para limpieza de tokens | 0 3 * * * |

Para más detalles, consulta `.env.example`.

## Testing

```bash
# Unit tests
$ npm run test

# E2E tests (requiere infraestructura de test)
$ npm run test:e2e

# Cobertura
$ npm run test:cov
```

## CI/CD
El proyecto incluye un workflow de GitHub Actions que corre automáticamente en cada push a `main`:
- **Lint**: Verificación de estilo.
- **Test**: Ejecución de tests E2E con servicios reales (Postgres/Redis) en Docker.
- **Build**: Verificación de que la imagen de Docker se construye correctamente.

---

## Swagger (OpenAPI)

- URL: `http://localhost:3000/api/v1/docs`
- En `production`: se habilita solo si `SWAGGER_ENABLED=true`.

## Metrics (Prometheus)

- URL: `http://localhost:3000/metrics`
- En `production`: se habilita solo si `METRICS_ENABLED=true` y requiere BasicAuth.

---

## License
Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
