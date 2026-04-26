import { Injectable } from '@nestjs/common';
import { Counter, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

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

  get contentType(): string {
    return this.registry.contentType;
  }

  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  incLoginSuccess(): void {
    this.authLoginSuccessTotal.inc();
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
}
