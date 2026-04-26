import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CronJob } from 'cron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, normalize } from 'path';
import { mkdir } from 'fs/promises';
import { AuditService } from '../audit/audit.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class BackupTask implements OnModuleInit {
  private readonly logger = new Logger(BackupTask.name);

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cronExpression =
      this.config.get<string>('BACKUP_CRON') || '0 4 * * *';

    const job = new CronJob(cronExpression, () => {
      void this.handleBackup();
    });

    this.schedulerRegistry.addCronJob('db-backup', job);
    job.start();

    this.logger.log(`Tarea de backup programada con cron: ${cronExpression}`);
  }

  private async handleBackup() {
    this.logger.log('Iniciando backup programado de base de datos...');

    const host = this.config.get<string>('DB_HOST');
    const port = this.config.get<number>('DB_PORT', 5432);
    const user = this.config.get<string>('DB_USER');
    const db = this.config.get<string>('DB_NAME');
    const password = this.config.get<string>('DB_PASSWORD');
    const backupPath = this.config.get<string>('BACKUP_PATH') || './backups';

    // 1. Validación de Path Traversal
    if (
      backupPath.includes('..') ||
      !normalize(backupPath).startsWith(normalize(backupPath))
    ) {
      this.logger.error(
        `Ruta de backup inválida (Path Traversal detectado): ${backupPath}`,
      );
      throw new InternalServerErrorException(
        'Configuración de backup insegura',
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${db}-${timestamp}.sql`;
    const fullPath = join(backupPath, filename);

    try {
      // Asegurar que el directorio de backups existe
      await mkdir(backupPath, { recursive: true });

      // 2. Uso de execFile para prevenir Shell Injection
      // 3. Paso de PGPASSWORD vía environment variables, no en el string del comando
      const env = {
        ...process.env,
        PGPASSWORD: password,
      };

      // 4. Argumentos pasados como array para evitar interpretación del shell
      await execFileAsync(
        'pg_dump',
        [
          '-h',
          host || 'localhost',
          '-p',
          String(port),
          '-U',
          user || 'postgres',
          '-d',
          db || '',
          '-f',
          fullPath,
        ],
        { env },
      );

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
