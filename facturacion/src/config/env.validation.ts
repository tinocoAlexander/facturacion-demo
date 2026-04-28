import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Base
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // Postgres pool tuning
  DB_POOL_MAX: Joi.number().integer().min(1).max(200).default(20),
  DB_POOL_IDLE_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: Joi.number().integer().min(1000).default(2000),

  // DB query timeouts
  DB_STATEMENT_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min':
      'JWT_SECRET debe tener al menos 32 caracteres para ser seguro',
  }),
  JWT_PRIVATE_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  JWT_PUBLIC_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // Refresh tokens
  REFRESH_TOKEN_TTL_DAYS: Joi.number().integer().min(1).max(365).default(7),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(60),

  // Anti brute-force login
  LOGIN_MAX_ATTEMPTS_EMAIL: Joi.number().integer().min(1).max(50).default(10),
  LOGIN_MAX_ATTEMPTS_IP: Joi.number().integer().min(1).max(200).default(30),
  LOGIN_ATTEMPT_WINDOW_MS: Joi.number()
    .integer()
    .min(10_000)
    .default(10 * 60_000),
  LOGIN_ATTEMPT_BLOCK_MS: Joi.number()
    .integer()
    .min(10_000)
    .default(15 * 60_000),

  // CORS
  CORS_ORIGIN: Joi.string(),

  // Proxy
  TRUST_PROXY: Joi.boolean().default(false),

  // HTTP server timeouts (ms)
  SERVER_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).default(30000),
  SERVER_HEADERS_TIMEOUT_MS: Joi.number().integer().min(1000).default(35000),
  SERVER_KEEP_ALIVE_TIMEOUT_MS: Joi.number().integer().min(1000).default(5000),

  // Redis
  REDIS_URL: Joi.string(),
  REDIS_PASSWORD: Joi.string(),

  // Security & TLS
  // Advertencia: Poner esto en '0' o 'false' deshabilita la verificación de certificados TLS,
  // lo cual es un riesgo de seguridad crítico (Man-in-the-Middle).
  NODE_TLS_REJECT_UNAUTHORIZED: Joi.string()
    .valid('0', '1', 'true', 'false')
    .default('1'),

  // Migrations
  // - En dev/test: corre por defecto
  // - En prod: solo si MIGRATIONS_AUTO_RUN=true
  MIGRATIONS_AUTO_RUN: Joi.boolean(),

  // Audit retention (days). Si se setea, se purgan logs más antiguos en el arranque.
  AUDIT_RETENTION_DAYS: Joi.number().integer().min(1).max(3650),

  // Swagger
  // - En dev se habilita por defecto (ver main.ts)
  // - En production solo se habilita si SWAGGER_ENABLED=true
  SWAGGER_ENABLED: Joi.boolean(),
  SWAGGER_BASIC_USER: Joi.string(),
  SWAGGER_BASIC_PASSWORD: Joi.string(),

  // Metrics (Prometheus)
  // - En dev se habilita por defecto (ver main.ts)
  // - En production solo se habilita si METRICS_ENABLED=true
  METRICS_ENABLED: Joi.boolean(),
  METRICS_BASIC_USER: Joi.string(),
  METRICS_BASIC_PASSWORD: Joi.string(),

  // Cleanup
  CLEANUP_CRON: Joi.string().default('0 3 * * *'),

  // Backups
  BACKUP_CRON: Joi.string().default('0 4 * * *'),
  BACKUP_PATH: Joi.string().default('./backups'),

  // Catalogos
  CATALOGOS_SYNC_CRON: Joi.string().default('0 2 * * 0'),

  // CSD Encryption
  CSD_ENCRYPTION_KEY: Joi.string()
    .hex()
    .length(64)
    .required()
    .messages({
      'any.required':
        'CSD_ENCRYPTION_KEY es requerida. Generar con: ' +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      'string.length':
        'CSD_ENCRYPTION_KEY debe tener exactamente 64 caracteres hex (32 bytes)',
      'string.hex': 'CSD_ENCRYPTION_KEY debe ser una cadena hexadecimal válida',
    }),
});
