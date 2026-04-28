import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { I_CATALOGOS_REPOSITORY } from '../interfaces/catalogos-repository.interface';
import type {
  ICatalogosRepository,
  ClaveProdServRow,
  ClaveUnidadRow,
  UsoCfdiRow,
  FormaPagoRow,
  RegimenFiscalRow,
  MetodoPagoRow,
  TipoRelacionRow,
} from '../interfaces/catalogos-repository.interface';

@Injectable()
export class CatalogosSyncService implements OnModuleInit {
  private readonly logger = new Logger(CatalogosSyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(I_CATALOGOS_REPOSITORY) private readonly repo: ICatalogosRepository,
  ) {}

  onModuleInit() {
    const cronExpression =
      this.config.get<string>('CATALOGOS_SYNC_CRON') ?? '0 2 * * 0';
    const job = new CronJob(cronExpression, () => void this.syncAll());
    this.schedulerRegistry.addCronJob('catalogos-sync', job);
    job.start();
    this.logger.log(`Sync de catálogos programado: ${cronExpression}`);
  }

  async syncAll() {
    try {
      await this.loadFromCSV<ClaveProdServRow>('c_ClaveProdServ', (data) =>
        this.repo.upsertBatchClaveProdServ(data),
      );
      await this.loadFromCSV<ClaveUnidadRow>('c_ClaveUnidad', (data) =>
        this.repo.upsertBatchClaveUnidad(data),
      );
      await this.loadFromCSV<UsoCfdiRow>('c_UsoCFDI', (data) =>
        this.repo.upsertBatchUsoCfdi(data),
      );
      await this.loadFromCSV<FormaPagoRow>('c_FormaPago', (data) =>
        this.repo.upsertBatchFormaPago(data),
      );
      await this.loadFromCSV<RegimenFiscalRow>('c_RegimenFiscal', (data) =>
        this.repo.upsertBatchRegimenFiscal(data),
      );
      await this.loadFromCSV<MetodoPagoRow>('c_MetodoPago', (data) =>
        this.repo.upsertBatchMetodoPago(data),
      );
      await this.loadFromCSV<TipoRelacionRow>('c_TipoRelacion', (data) =>
        this.repo.upsertBatchTipoRelacion(data),
      );
      this.logger.log('Sincronización de catálogos finalizada.');
    } catch (err) {
      this.logger.error(
        'Error durante la sincronización de catálogos',
        (err as Error).message,
      );
    }
  }

  private async loadFromCSV<T = Record<string, string>>(
    fileName: string,
    upsertFn: (data: T[]) => Promise<void>,
  ) {
    const filePath = path.join(
      process.cwd(),
      'seeds',
      'catalogos',
      `${fileName}.csv`,
    );
    if (!fs.existsSync(filePath)) {
      this.logger.warn(
        `El archivo CSV ${fileName}.csv no se encontró en /seeds/catalogos`,
      );
      return;
    }

    this.logger.log(`Cargando ${fileName}...`);
    const results: T[] = [];

    // Cast para evitar errores de linter con csv-parser sin tipos explícitos en el entorno
    const parser = (csv as unknown as () => NodeJS.ReadWriteStream)();

    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (data: T) => results.push(data))
        .on('end', () => {
          void (async () => {
            try {
              // Batch inserts in chunks of 1000
              const chunkSize = 1000;
              for (let i = 0; i < results.length; i += chunkSize) {
                const chunk = results.slice(i, i + chunkSize);
                await upsertFn(chunk);
              }
              this.logger.log(
                `Carga de ${fileName} completada. (${results.length} registros)`,
              );
              resolve();
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)));
            }
          })();
        })
        .on('error', (error: Error) => {
          this.logger.error(`Error leyendo ${fileName}.csv`, error.message);
          reject(error);
        });
    });
  }
}
