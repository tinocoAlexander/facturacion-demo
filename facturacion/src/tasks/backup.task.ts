import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { AuditService } from '../audit/audit.service';

const execAsync = promisify(exec);

@Injectable()
export class BackupTask {
  private readonly logger = new Logger(BackupTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  @Cron(process.env.BACKUP_CRON || '0 4 * * *')
  async handleBackup() {
    this.logger.log('Iniciando backup programado de base de datos...');

    const host = this.config.get<string>('DB_HOST');
    const port = this.config.get<number>('DB_PORT');
    const user = this.config.get<string>('DB_USER');
    const db = this.config.get<string>('DB_NAME');
    const password = this.config.get<string>('DB_PASSWORD');
    const backupPath = this.config.get<string>('BACKUP_PATH') || './backups';

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${db}-${timestamp}.sql`;
    const fullPath = join(backupPath, filename);

    try {
      // Asegurar que el directorio de backups existe
      await mkdir(backupPath, { recursive: true });

      // pg_dump usa la variable de entorno PGPASSWORD para autenticación no interactiva
      const command = `PGPASSWORD='${password}' pg_dump -h ${host} -p ${port} -U ${user} -d ${db} -f ${fullPath}`;
      
      await execAsync(command);

      this.logger.log(`Backup completado exitosamente: ${fullPath}`);
      
      await this.audit.log('SYSTEM_DB_BACKUP', {
        metadata: {
          filename,
          path: fullPath,
        },
      });
    } catch (err) {
      this.logger.error(
        'Error durante el backup de base de datos:',
        (err as Error).message,
      );
    }
  }
}
