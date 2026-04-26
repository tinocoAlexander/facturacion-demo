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

  // JWT
  JWT_SECRET: Joi.string().required(),
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

  // Redis
  REDIS_URL: Joi.string(),

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
});
