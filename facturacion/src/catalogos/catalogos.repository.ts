import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { CATALOGOS_QUERIES } from '../database/queries/catalogos.queries';
import {
  ICatalogosRepository,
  ClaveProdServRow,
  ClaveUnidadRow,
  UsoCfdiRow,
  FormaPagoRow,
  RegimenFiscalRow,
  MetodoPagoRow,
  TipoRelacionRow,
} from './interfaces/catalogos-repository.interface';
import {
  ClaveProdServ,
  ClaveUnidad,
  UsoCfdi,
  FormaPago,
  RegimenFiscal,
  MetodoPago,
  TipoRelacion,
} from './catalogos.types';

@Injectable()
export class CatalogosRepository implements ICatalogosRepository {
  private readonly logger = new Logger(CatalogosRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async searchClaveProdServ(
    query: string,
    limit: number,
  ): Promise<ClaveProdServ[]> {
    try {
      const { rows } = await this.pool.query<ClaveProdServ>(
        CATALOGOS_QUERIES.SEARCH_CLAVE_PROD_SERV,
        [query, limit],
      );
      return rows;
    } catch (err) {
      this.logger.error('searchClaveProdServ failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async searchClaveUnidad(
    query: string,
    limit: number,
  ): Promise<ClaveUnidad[]> {
    try {
      const { rows } = await this.pool.query<ClaveUnidad>(
        CATALOGOS_QUERIES.SEARCH_CLAVE_UNIDAD,
        [query, limit],
      );
      return rows;
    } catch (err) {
      this.logger.error('searchClaveUnidad failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAllUsoCfdi(): Promise<UsoCfdi[]> {
    try {
      const { rows } = await this.pool.query<UsoCfdi>(
        CATALOGOS_QUERIES.FIND_ALL_USO_CFDI,
      );
      return rows;
    } catch (err) {
      this.logger.error('findAllUsoCfdi failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAllFormaPago(): Promise<FormaPago[]> {
    try {
      const { rows } = await this.pool.query<FormaPago>(
        CATALOGOS_QUERIES.FIND_ALL_FORMA_PAGO,
      );
      return rows;
    } catch (err) {
      this.logger.error('findAllFormaPago failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAllRegimenFiscal(
    tipo?: 'fisica' | 'moral',
  ): Promise<RegimenFiscal[]> {
    try {
      const { rows } = await this.pool.query<RegimenFiscal>(
        CATALOGOS_QUERIES.FIND_ALL_REGIMEN_FISCAL,
      );
      if (tipo === 'fisica') return rows.filter((r) => r.aplica_fisica);
      if (tipo === 'moral') return rows.filter((r) => r.aplica_moral);
      return rows;
    } catch (err) {
      this.logger.error('findAllRegimenFiscal failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAllMetodoPago(): Promise<MetodoPago[]> {
    try {
      const { rows } = await this.pool.query<MetodoPago>(
        CATALOGOS_QUERIES.FIND_ALL_METODO_PAGO,
      );
      return rows;
    } catch (err) {
      this.logger.error('findAllMetodoPago failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAllTipoRelacion(): Promise<TipoRelacion[]> {
    try {
      const { rows } = await this.pool.query<TipoRelacion>(
        CATALOGOS_QUERIES.FIND_ALL_TIPO_RELACION,
      );
      return rows;
    } catch (err) {
      this.logger.error('findAllTipoRelacion failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateClaveProdServ(clave: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        CATALOGOS_QUERIES.VALIDATE_CLAVE_PROD_SERV,
        [clave],
      );
      return rows.length > 0;
    } catch (err) {
      this.logger.error('validateClaveProdServ failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateClaveUnidad(clave: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        CATALOGOS_QUERIES.VALIDATE_CLAVE_UNIDAD,
        [clave],
      );
      return rows.length > 0;
    } catch (err) {
      this.logger.error('validateClaveUnidad failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateUsoCfdi(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean> {
    try {
      const { rows } = await this.pool.query<UsoCfdi>(
        CATALOGOS_QUERIES.VALIDATE_USO_CFDI,
        [clave],
      );
      if (rows.length === 0) return false;
      if (tipoPersona === 'fisica' && !rows[0].aplica_fisica) return false;
      if (tipoPersona === 'moral' && !rows[0].aplica_moral) return false;
      return true;
    } catch (err) {
      this.logger.error('validateUsoCfdi failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateFormaPago(clave: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        CATALOGOS_QUERIES.VALIDATE_FORMA_PAGO,
        [clave],
      );
      return rows.length > 0;
    } catch (err) {
      this.logger.error('validateFormaPago failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateRegimenFiscal(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean> {
    try {
      const { rows } = await this.pool.query<RegimenFiscal>(
        CATALOGOS_QUERIES.VALIDATE_REGIMEN_FISCAL,
        [clave],
      );
      if (rows.length === 0) return false;
      if (tipoPersona === 'fisica' && !rows[0].aplica_fisica) return false;
      if (tipoPersona === 'moral' && !rows[0].aplica_moral) return false;
      return true;
    } catch (err) {
      this.logger.error('validateRegimenFiscal failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateMetodoPago(clave: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        CATALOGOS_QUERIES.VALIDATE_METODO_PAGO,
        [clave],
      );
      return rows.length > 0;
    } catch (err) {
      this.logger.error('validateMetodoPago failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateTipoRelacion(clave: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(
        CATALOGOS_QUERIES.VALIDATE_TIPO_RELACION,
        [clave],
      );
      return rows.length > 0;
    } catch (err) {
      this.logger.error('validateTipoRelacion failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async validateManyClavesProdServ(claves: string[]): Promise<string[]> {
    try {
      const { rows } = await this.pool.query<{ clave: string }>(
        CATALOGOS_QUERIES.VALIDATE_MANY_CLAVE_PROD_SERV,
        [claves],
      );
      return rows.map((r) => r.clave);
    } catch (err) {
      this.logger.error(
        'validateManyClavesProdServ failed',
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  private async executeBatchUpsert<T>(
    query: string,
    data: T[],
    mapper: (row: T) => (string | boolean | number | null | undefined)[],
  ) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of data) {
        await client.query(query, mapper(row));
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error('Batch upsert failed', (err as Error).message);
      throw err;
    } finally {
      client.release();
    }
  }

  async upsertBatchClaveProdServ(data: ClaveProdServRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_CLAVE_PROD_SERV,
      data,
      (row) => [row.c_ClaveProdServ, row.Descripción],
    );
  }

  async upsertBatchClaveUnidad(data: ClaveUnidadRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_CLAVE_UNIDAD,
      data,
      (row) => [row.c_ClaveUnidad, row.Nombre, row.Descripción, row.Nota],
    );
  }

  async upsertBatchUsoCfdi(data: UsoCfdiRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_USO_CFDI,
      data,
      (row) => [
        row.c_UsoCFDI,
        row.Descripción,
        row.Física === 'Sí',
        row.Moral === 'Sí',
      ],
    );
  }

  async upsertBatchFormaPago(data: FormaPagoRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_FORMA_PAGO,
      data,
      (row) => [row.c_FormaPago, row.Descripción],
    );
  }

  async upsertBatchRegimenFiscal(data: RegimenFiscalRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_REGIMEN_FISCAL,
      data,
      (row) => [
        row.c_RegimenFiscal,
        row.Descripción,
        row.Física === 'Sí',
        row.Moral === 'Sí',
      ],
    );
  }

  async upsertBatchMetodoPago(data: MetodoPagoRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_METODO_PAGO,
      data,
      (row) => [row.c_MetodoPago, row.Descripción],
    );
  }

  async upsertBatchTipoRelacion(data: TipoRelacionRow[]): Promise<void> {
    await this.executeBatchUpsert(
      CATALOGOS_QUERIES.UPSERT_TIPO_RELACION,
      data,
      (row) => [row.c_TipoRelacion, row.Descripción],
    );
  }
}
