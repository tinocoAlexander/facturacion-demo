import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { CLEANUP_QUERIES } from '../database/queries/cleanup.queries';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CleanupTask {
  private readonly logger = new Logger(CleanupTask.name);

  constructor(
    @InjectPool() private readonly pool: Pool,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  // El cron se define dinámicamente desde el ConfigService si es posible,
  // pero el decorador @Cron requiere una constante o una propiedad de clase.
  // NestJS permite usar variables de entorno directamente en el decorador.
  @Cron(process.env.CLEANUP_CRON || '0 3 * * *')
  async handleCleanup() {
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
