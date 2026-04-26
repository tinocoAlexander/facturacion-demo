import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Pool } from 'pg';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query('SELECT 1');
      return this.getStatus(key, true);
    } catch (error) {
      const err = error as Error;
      console.error('Database health check error:', err.message, err.stack);
      throw new HealthCheckError(
        'Database connection failed',
        this.getStatus(key, false, { message: err.message }),
      );
    }
  }
}
