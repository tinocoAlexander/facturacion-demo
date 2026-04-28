import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from './database.constants';
import { MetricsService } from '../metrics/metrics.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbMetricsTask implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbMetricsTask.name);
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectPool() private readonly pool: Pool,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const maxConnections = this.config.get<number>('DB_POOL_MAX') ?? 20;

    // Actualizar métricas del pool cada 30 segundos
    this.metricsInterval = setInterval(() => {
      this.metrics.setDbPoolMetrics({
        total: maxConnections,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      });
    }, 30000);

    this.metricsInterval.unref();
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      this.logger.log('Intervalo de métricas de base de datos detenido.');
    }
  }
}
