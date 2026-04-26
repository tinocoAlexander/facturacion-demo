import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { I_CATALOGOS_REPOSITORY } from '../interfaces/catalogos-repository.interface';
import type { ICatalogosRepository } from '../interfaces/catalogos-repository.interface';

@Injectable()
export class CatalogosSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CatalogosSyncService.name);

  constructor(
    @Inject(I_CATALOGOS_REPOSITORY) private readonly repo: ICatalogosRepository,
  ) {}

  async onApplicationBootstrap() {
    // Optionally trigger initial load if DB is empty
    // await this.syncAll();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async handleCron() {
    this.logger.log('Iniciando sincronización semanal de catálogos SAT...');
    await this.syncAll();
  }

  async syncAll() {
    try {
      await this.loadFromCSV('c_ClaveProdServ', (data) =>
        this.repo.upsertBatchClaveProdServ(data),
      );
      await this.loadFromCSV('c_ClaveUnidad', (data) =>
        this.repo.upsertBatchClaveUnidad(data),
      );
      await this.loadFromCSV('c_UsoCFDI', (data) =>
        this.repo.upsertBatchUsoCfdi(data),
      );
      await this.loadFromCSV('c_FormaPago', (data) =>
        this.repo.upsertBatchFormaPago(data),
      );
      await this.loadFromCSV('c_RegimenFiscal', (data) =>
        this.repo.upsertBatchRegimenFiscal(data),
      );
      await this.loadFromCSV('c_MetodoPago', (data) =>
        this.repo.upsertBatchMetodoPago(data),
      );
      await this.loadFromCSV('c_TipoRelacion', (data) =>
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

  private async loadFromCSV(
    fileName: string,
    upsertFn: (data: Record<string, string>[]) => Promise<void>,
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
    const results: Record<string, string>[] = [];

    // Cast para evitar errores de linter con csv-parser sin tipos explícitos en el entorno
    const parser = (csv as unknown as () => NodeJS.ReadWriteStream)();

    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parser)
        .on('data', (data: Record<string, string>) => results.push(data))
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
