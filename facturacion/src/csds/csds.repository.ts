import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { CSD_QUERIES } from '../database/queries/csds.queries';
import { Csd } from './csds.types';
import {
  ICsdRepository,
  CreateCsdData,
} from './interfaces/csds-repository.interface';

@Injectable()
export class CsdsRepository implements ICsdRepository {
  private readonly logger = new Logger(CsdsRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async findActiveByEmpresa(empresaId: string): Promise<Csd | null> {
    try {
      const { rows } = await this.pool.query<Csd>(
        CSD_QUERIES.FIND_ACTIVE_BY_EMPRESA,
        [empresaId],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(
        `findActiveByEmpresa failed for ${empresaId}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  async findById(id: string, empresaId: string): Promise<Csd | null> {
    try {
      const { rows } = await this.pool.query<Csd>(CSD_QUERIES.FIND_BY_ID, [
        id,
        empresaId,
      ]);
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(`findById failed for ${id}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async create(data: CreateCsdData): Promise<Csd> {
    try {
      const { rows } = await this.pool.query<Csd>(CSD_QUERIES.CREATE, [
        data.empresa_id,
        data.no_certificado,
        data.cer_cifrado,
        data.key_cifrado,
        data.password_cifrado,
        data.iv_cer,
        data.iv_key,
        data.iv_password,
        data.key_version,
        data.fecha_inicio_vigencia,
        data.fecha_fin_vigencia,
      ]);
      return rows[0];
    } catch (err) {
      this.logger.error('create failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async setActive(id: string, empresaId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(CSD_QUERIES.SET_ACTIVE_DEACTIVATE_ALL, [empresaId]);
      await client.query(CSD_QUERIES.SET_ACTIVE_ACTIVATE_ONE, [id, empresaId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      this.logger.error(`setActive failed for ${id}`, (err as Error).message);
      throw new InternalServerErrorException();
    } finally {
      client.release();
    }
  }

  async findAllByEmpresa(
    empresaId: string,
    limit: number,
    offset: number,
  ): Promise<Csd[]> {
    try {
      const { rows } = await this.pool.query<Csd>(
        CSD_QUERIES.FIND_ALL_BY_EMPRESA,
        [empresaId, limit, offset],
      );
      return rows;
    } catch (err) {
      this.logger.error(
        `findAllByEmpresa failed for ${empresaId}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  async countAllByEmpresa(empresaId: string): Promise<number> {
    try {
      const { rows } = await this.pool.query<{ total: number }>(
        CSD_QUERIES.COUNT_ALL_BY_EMPRESA,
        [empresaId],
      );
      return rows[0]?.total ?? 0;
    } catch (err) {
      this.logger.error(
        `countAllByEmpresa failed for ${empresaId}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  async checkNoCertificadoExists(noCertificado: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(CSD_QUERIES.CHECK_NO_CERTIFICADO, [
        noCertificado,
      ]);
      return rows.length > 0;
    } catch (err) {
      this.logger.error(
        `checkNoCertificadoExists failed for ${noCertificado}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }
}
