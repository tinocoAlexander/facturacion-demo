import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { EMPRESA_QUERIES } from '../database/queries/empresas.queries';
import { Empresa } from './empresas.types';
import {
  IEmpresasRepository,
  CreateEmpresaData,
  UpdateEmpresaData,
} from './interfaces/empresas-repository.interface';

@Injectable()
export class EmpresasRepository implements IEmpresasRepository {
  private readonly logger = new Logger(EmpresasRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async findById(id: string): Promise<Empresa | null> {
    try {
      const { rows } = await this.pool.query<Empresa>(
        EMPRESA_QUERIES.FIND_BY_ID,
        [id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(`findById failed: ${id}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findByRfc(rfc: string): Promise<Empresa | null> {
    try {
      const { rows } = await this.pool.query<Empresa>(
        EMPRESA_QUERIES.FIND_BY_RFC,
        [rfc],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(`findByRfc failed: ${rfc}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async rfcExists(rfc: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(EMPRESA_QUERIES.RFC_EXISTS, [rfc]);
      return rows.length > 0;
    } catch (err) {
      this.logger.error(`rfcExists failed: ${rfc}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findByUser(userId: number): Promise<Empresa | null> {
    try {
      const { rows } = await this.pool.query<Empresa>(
        EMPRESA_QUERIES.FIND_BY_USER,
        [userId],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(`findByUser failed: ${userId}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async create(data: CreateEmpresaData): Promise<Empresa> {
    try {
      const { rows } = await this.pool.query<Empresa>(EMPRESA_QUERIES.CREATE, [
        data.rfc,
        data.nombre_comercial,
        data.razon_social,
        data.regimen_fiscal,
        data.codigo_postal,
        data.email_contacto ?? null,
        data.telefono ?? null,
        data.logo_url ?? null,
      ]);
      return rows[0];
    } catch (err) {
      this.logger.error('create empresa failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async update(id: string, data: UpdateEmpresaData): Promise<Empresa | null> {
    try {
      const { rows } = await this.pool.query<Empresa>(EMPRESA_QUERIES.UPDATE, [
        data.nombre_comercial ?? null,
        data.razon_social ?? null,
        data.regimen_fiscal ?? null,
        data.codigo_postal ?? null,
        data.email_contacto ?? null,
        data.telefono ?? null,
        data.logo_url ?? null,
        id,
      ]);
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(`update empresa failed: ${id}`, (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async setActive(id: string, isActive: boolean): Promise<Empresa | null> {
    try {
      const { rows } = await this.pool.query<Empresa>(
        EMPRESA_QUERIES.SET_ACTIVE,
        [isActive, id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error(
        `setActive failed: ${id} to ${isActive}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  async findAll(limit: number, offset: number): Promise<Empresa[]> {
    try {
      const { rows } = await this.pool.query<Empresa>(
        EMPRESA_QUERIES.FIND_ALL_PAGINATED,
        [limit, offset],
      );
      return rows;
    } catch (err) {
      this.logger.error('findAll failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async countAll(): Promise<number> {
    try {
      const { rows } = await this.pool.query<{ total: number }>(
        EMPRESA_QUERIES.COUNT_ALL,
      );
      return rows[0]?.total ?? 0;
    } catch (err) {
      this.logger.error('countAll failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async assignUser(empresaId: string, userId: number): Promise<void> {
    try {
      await this.pool.query(EMPRESA_QUERIES.ASSIGN_USER, [empresaId, userId]);
    } catch (err) {
      this.logger.error(
        `assignUser failed: user ${userId} to empresa ${empresaId}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }

  async removeUser(userId: number, empresaId: string): Promise<void> {
    try {
      await this.pool.query(EMPRESA_QUERIES.REMOVE_USER, [userId, empresaId]);
    } catch (err) {
      this.logger.error(
        `removeUser failed: user ${userId} from empresa ${empresaId}`,
        (err as Error).message,
      );
      throw new InternalServerErrorException();
    }
  }
}
