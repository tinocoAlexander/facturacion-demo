import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.redis) {
      return this.getStatus(key, false, { message: 'Redis is not configured' });
    }

    try {
      const ping = await this.redis.ping();
      const isHealthy = ping === 'PONG';
      const result = this.getStatus(key, isHealthy);

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Redis ping failed', result);
    } catch (err) {
      throw new HealthCheckError(
        'Redis is unreachable',
        this.getStatus(key, false, { message: (err as Error).message }),
      );
    }
  }
}
