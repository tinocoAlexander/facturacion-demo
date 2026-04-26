import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { CLEANUP_QUERIES } from '../database/queries/cleanup.queries';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CleanupTask implements OnModuleInit {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(
    @InjectPool() private readonly pool: Pool,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cronExpression =
      this.config.get<string>('CLEANUP_CRON') || '0 3 * * *';

    const job = new CronJob(cronExpression, () => {
      void this.handleCleanup();
    });

    this.schedulerRegistry.addCronJob('token-cleanup', job);
    job.start();

    this.logger.log(`Tarea de limpieza programada con cron: ${cronExpression}`);
  }

  private async handleCleanup() {
    this.logger.log('Iniciando limpieza programada de tokens...');

    try {
      const { rows } = await this.pool.query<{ count: number }>(
        CLEANUP_QUERIES.CLEANUP_REFRESH_TOKENS,
      );

      const count = rows[0]?.count ?? 0;

      this.logger.log(`Limpieza completada. Tokens eliminados: ${count}`);

      if (count > 0) {
        await this.audit.log('SYSTEM_CLEANUP_TOKENS', {
          metadata: {
            deletedRows: count,
            type: 'refresh_tokens',
          },
        });
      }
    } catch (err) {
      // Capturamos el error para que no afecte a otros crons o al proceso
      this.logger.error(
        'Error durante la limpieza de tokens:',
        (err as Error).message,
      );
    }
  }
}
