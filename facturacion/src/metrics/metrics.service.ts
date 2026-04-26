import { Injectable } from '@nestjs/common';
import { Counter, Registry, collectDefaultMetrics, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  // --- HTTP Metrics ---
  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total de peticiones HTTP',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de peticiones HTTP en segundos',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [this.registry],
  });

  // --- Database Metrics ---
  private readonly dbPoolTotalConnections = new Gauge({
    name: 'db_pool_total_connections',
    help: 'Máximo de conexiones configuradas en el pool',
    registers: [this.registry],
  });

  private readonly dbPoolIdleConnections = new Gauge({
    name: 'db_pool_idle_connections',
    help: 'Conexiones libres en el pool',
    registers: [this.registry],
  });

  private readonly dbPoolWaitingCount = new Gauge({
    name: 'db_pool_waiting_count',
    help: 'Queries esperando conexión en el pool',
    registers: [this.registry],
  });

  private readonly dbQueryDurationSeconds = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duración de queries a base de datos',
    labelNames: ['operation'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [this.registry],
  });

  // --- Auth & Business Metrics ---
  private readonly authLoginSuccessTotal = new Counter({
    name: 'auth_login_success_total',
    help: 'Total de logins exitosos',
    registers: [this.registry],
  });

  private readonly authLoginFailedTotal = new Counter({
    name: 'auth_login_failed_total',
    help: 'Total de logins fallidos',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  private readonly authRefreshSuccessTotal = new Counter({
    name: 'auth_refresh_success_total',
    help: 'Total de refresh exitosos',
    registers: [this.registry],
  });

  private readonly authRefreshFailedTotal = new Counter({
    name: 'auth_refresh_failed_total',
    help: 'Total de refresh fallidos',
    labelNames: ['reason'] as const,
    registers: [this.registry],
  });

  private readonly authActiveSessionsGauge = new Gauge({
    name: 'auth_active_sessions_gauge',
    help: 'Sesiones activas actualmente',
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  // --- Methods for Auth ---
  incLoginSuccess(): void {
    this.authLoginSuccessTotal.inc();
    this.incActiveSessions();
  }

  incLoginFailed(reason: string): void {
    this.authLoginFailedTotal.inc({ reason });
  }

  incRefreshSuccess(): void {
    this.authRefreshSuccessTotal.inc();
  }

  incRefreshFailed(reason: string): void {
    this.authRefreshFailedTotal.inc({ reason });
  }

  incActiveSessions(): void {
    this.authActiveSessionsGauge.inc();
  }

  decActiveSessions(): void {
    this.authActiveSessionsGauge.dec();
  }

  // --- Methods for HTTP ---
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, duration);
  }

  // --- Methods for DB ---
  recordDbQuery(operation: string, durationSeconds: number): void {
    this.dbQueryDurationSeconds.observe({ operation }, durationSeconds);
  }

  setDbPoolMetrics(metrics: { total: number; idle: number; waiting: number }): void {
    this.dbPoolTotalConnections.set(metrics.total);
    this.dbPoolIdleConnections.set(metrics.idle);
    this.dbPoolWaitingCount.set(metrics.waiting);
  }
}
