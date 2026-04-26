import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OnApplicationShutdown } from '@nestjs/common';

type AttemptRecord = {
  count: number;
  firstAttemptAtMs: number;
  blockedUntilMs?: number;
};

@Injectable()
export class LoginAttemptsService implements OnApplicationShutdown {
  private readonly byEmail = new Map<string, AttemptRecord>();
  private readonly byIp = new Map<string, AttemptRecord>();

  private readonly redis?: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (url) {
      this.redis = new Redis(url, { maxRetriesPerRequest: 2 });
    }
  }

  async onApplicationShutdown() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  async assertNotBlocked(email: string, ip?: string) {
    if (this.redis) {
      const emailKey = this.normalizeEmail(email);

      const blockKeys = [this.blockKey('email', emailKey)];
      if (ip) blockKeys.push(this.blockKey('ip', ip));

      const values = await this.redis.mget(blockKeys);
      if (values.some((v) => v !== null)) {
        throw new HttpException(
          {
            message: 'Demasiados intentos. Intenta más tarde.',
            code: 'AUTH_TOO_MANY_ATTEMPTS',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      return;
    }

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

  async registerFailure(email: string, ip?: string) {
    if (this.redis) {
      const emailKey = this.normalizeEmail(email);
      await this.bumpRedis('email', emailKey, this.maxAttemptsEmail);
      if (ip) await this.bumpRedis('ip', ip, this.maxAttemptsIp);
      return;
    }

    const now = Date.now();
    const windowMs = this.windowMs;
    const blockMs = this.blockMs;

    const emailKey = this.normalizeEmail(email);
    this.byEmail.set(
      emailKey,
      this.bump(
        this.byEmail.get(emailKey),
        now,
        windowMs,
        blockMs,
        this.maxAttemptsEmail,
      ),
    );

    if (ip) {
      this.byIp.set(
        ip,
        this.bump(
          this.byIp.get(ip),
          now,
          windowMs,
          blockMs,
          this.maxAttemptsIp,
        ),
      );
    }

    this.cleanup();
  }

  async registerSuccess(email: string, ip?: string) {
    if (this.redis) {
      const emailKey = this.normalizeEmail(email);
      const keys = [this.attemptsKey('email', emailKey)];
      if (ip) keys.push(this.attemptsKey('ip', ip));
      await this.redis.del(keys);
      return;
    }

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

  private attemptsKey(type: 'email' | 'ip', id: string): string {
    return `login:attempts:${type}:${id}`;
  }

  private blockKey(type: 'email' | 'ip', id: string): string {
    return `login:block:${type}:${id}`;
  }

  private async bumpRedis(
    type: 'email' | 'ip',
    id: string,
    maxAttempts: number,
  ) {
    if (!this.redis) return;

    const blockKey = this.blockKey(type, id);
    const attemptsKey = this.attemptsKey(type, id);

    const blocked = await this.redis.exists(blockKey);
    if (blocked) return;

    const multi = this.redis.multi();
    multi.incr(attemptsKey);
    multi.pttl(attemptsKey);

    const execRes = await multi.exec();
    const count = Number(execRes?.[0]?.[1] ?? 0);
    const ttl = Number(execRes?.[1]?.[1] ?? -1);

    if (ttl === -1) {
      await this.redis.pexpire(attemptsKey, this.windowMs);
    }

    if (count >= maxAttempts) {
      await this.redis
        .multi()
        .set(blockKey, '1', 'PX', this.blockMs)
        .del(attemptsKey)
        .exec();
    }
  }
}
