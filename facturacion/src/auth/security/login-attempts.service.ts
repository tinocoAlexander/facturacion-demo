import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type AttemptRecord = {
  count: number;
  firstAttemptAtMs: number;
  blockedUntilMs?: number;
};

@Injectable()
export class LoginAttemptsService {
  private readonly byEmail = new Map<string, AttemptRecord>();
  private readonly byIp = new Map<string, AttemptRecord>();

  constructor(private readonly config: ConfigService) {}

  assertNotBlocked(email: string, ip?: string) {
    const now = Date.now();

    const emailKey = this.normalizeEmail(email);
    const emailRecord = this.byEmail.get(emailKey);
    if (emailRecord?.blockedUntilMs && emailRecord.blockedUntilMs > now) {
      throw new HttpException(
        'Demasiados intentos. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ip) {
      const ipRecord = this.byIp.get(ip);
      if (ipRecord?.blockedUntilMs && ipRecord.blockedUntilMs > now) {
        throw new HttpException(
          'Demasiados intentos. Intenta más tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  registerFailure(email: string, ip?: string) {
    const now = Date.now();
    const windowMs = this.windowMs;
    const blockMs = this.blockMs;

    const emailKey = this.normalizeEmail(email);
    this.byEmail.set(emailKey, this.bump(this.byEmail.get(emailKey), now, windowMs, blockMs, this.maxAttemptsEmail));

    if (ip) {
      this.byIp.set(ip, this.bump(this.byIp.get(ip), now, windowMs, blockMs, this.maxAttemptsIp));
    }

    this.cleanup();
  }

  registerSuccess(email: string, ip?: string) {
    const emailKey = this.normalizeEmail(email);
    this.byEmail.delete(emailKey);

    if (ip) this.byIp.delete(ip);
  }

  private bump(
    record: AttemptRecord | undefined,
    now: number,
    windowMs: number,
    blockMs: number,
    maxAttempts: number,
  ): AttemptRecord {
    if (!record) {
      return { count: 1, firstAttemptAtMs: now };
    }

    // Reset de ventana
    if (now - record.firstAttemptAtMs > windowMs) {
      return { count: 1, firstAttemptAtMs: now };
    }

    const nextCount = record.count + 1;
    const next: AttemptRecord = {
      count: nextCount,
      firstAttemptAtMs: record.firstAttemptAtMs,
    };

    if (nextCount >= maxAttempts) {
      next.blockedUntilMs = now + blockMs;
    }

    return next;
  }

  private cleanup() {
    // Evitar crecimiento infinito en memoria (modo demo). En producción: Redis.
    const maxKeys = 10_000;
    if (this.byEmail.size <= maxKeys && this.byIp.size <= maxKeys) return;

    // Limpieza simple: borra mapas completos si se excede.
    // (Preferible implementar LRU/Redis en producción.)
    this.byEmail.clear();
    this.byIp.clear();
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').toLowerCase().trim();
  }

  private get windowMs(): number {
    return this.config.get<number>('LOGIN_ATTEMPT_WINDOW_MS') ?? 10 * 60_000;
  }

  private get blockMs(): number {
    return this.config.get<number>('LOGIN_ATTEMPT_BLOCK_MS') ?? 15 * 60_000;
  }

  private get maxAttemptsEmail(): number {
    return this.config.get<number>('LOGIN_MAX_ATTEMPTS_EMAIL') ?? 10;
  }

  private get maxAttemptsIp(): number {
    return this.config.get<number>('LOGIN_MAX_ATTEMPTS_IP') ?? 30;
  }
}
