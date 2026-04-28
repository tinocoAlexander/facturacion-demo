import {
  Injectable,
  HttpStatus,
  Inject,
  Optional,
  Logger,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { I_CATALOGOS_REPOSITORY } from './interfaces/catalogos-repository.interface';
import type { ICatalogosRepository } from './interfaces/catalogos-repository.interface';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { ResponseCatalogoDto } from './dtos';
import { mapToResponseCatalogoDto } from './catalogos.mapper';
import { httpError } from '../common/errors/http-error';

@Injectable()
export class CatalogosService {
  private readonly logger = new Logger(CatalogosService.name);

  constructor(
    @Inject(I_CATALOGOS_REPOSITORY) private readonly repo: ICatalogosRepository,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  private readonly CACHE_TTL_ALL = 86400; // 24h
  private readonly CACHE_TTL_ITEM = 3600; // 1h

  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached !== null) return JSON.parse(cached) as T;
      } catch (err) {
        this.logger.warn(
          `Cache read failed for ${key}`,
          (err as Error).message,
        );
      }
    }

    const data = await fetcher();

    if (this.redis) {
      try {
        // Cachear incluso arrays vacíos para prevenir cache stampede
        await this.redis.setex(key, ttl, JSON.stringify(data));
      } catch (err) {
        this.logger.warn(
          `Cache write failed for ${key}`,
          (err as Error).message,
        );
      }
    }

    return data;
  }

  // --- Endpoints para Frontend (Búsquedas y Listados) ---

  async searchClaveProdServ(
    query: string,
    limit: number,
  ): Promise<ResponseCatalogoDto[]> {
    const results = await this.repo.searchClaveProdServ(query, limit);
    return results.map(mapToResponseCatalogoDto);
  }

  async searchClaveUnidad(
    query: string,
    limit: number,
  ): Promise<ResponseCatalogoDto[]> {
    const results = await this.repo.searchClaveUnidad(query, limit);
    return results.map(mapToResponseCatalogoDto);
  }

  async getUsoCfdi(): Promise<ResponseCatalogoDto[]> {
    const data = await this.getCached(
      'catalogo:uso_cfdi:all',
      () => this.repo.findAllUsoCfdi(),
      this.CACHE_TTL_ALL,
    );
    return data.map(mapToResponseCatalogoDto);
  }

  async getFormaPago(): Promise<ResponseCatalogoDto[]> {
    const data = await this.getCached(
      'catalogo:forma_pago:all',
      () => this.repo.findAllFormaPago(),
      this.CACHE_TTL_ALL,
    );
    return data.map(mapToResponseCatalogoDto);
  }

  async getRegimenFiscal(
    tipo: 'fisica' | 'moral' | 'todos',
  ): Promise<ResponseCatalogoDto[]> {
    const key = `catalogo:regimen_fiscal:${tipo}`;
    const tipoArg = tipo === 'todos' ? undefined : tipo;
    const data = await this.getCached(
      key,
      () => this.repo.findAllRegimenFiscal(tipoArg),
      this.CACHE_TTL_ALL,
    );
    return data.map(mapToResponseCatalogoDto);
  }

  async getMetodoPago(): Promise<ResponseCatalogoDto[]> {
    const data = await this.getCached(
      'catalogo:metodo_pago:all',
      () => this.repo.findAllMetodoPago(),
      this.CACHE_TTL_ALL,
    );
    return data.map(mapToResponseCatalogoDto);
  }

  async getTipoRelacion(): Promise<ResponseCatalogoDto[]> {
    const data = await this.getCached(
      'catalogo:tipo_relacion:all',
      () => this.repo.findAllTipoRelacion(),
      this.CACHE_TTL_ALL,
    );
    return data.map(mapToResponseCatalogoDto);
  }

  // --- Validaciones (Usadas por otros módulos) ---

  async validateClaveProdServ(clave: string): Promise<boolean> {
    const key = `catalogo:prod_serv:${clave}`;
    return this.getCached(
      key,
      () => this.repo.validateClaveProdServ(clave),
      this.CACHE_TTL_ITEM,
    );
  }

  async validateClaveUnidad(clave: string): Promise<boolean> {
    const key = `catalogo:unidad:${clave}`;
    return this.getCached(
      key,
      () => this.repo.validateClaveUnidad(clave),
      this.CACHE_TTL_ITEM,
    );
  }

  async validateUsoCfdi(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean> {
    return this.repo.validateUsoCfdi(clave, tipoPersona);
  }

  async validateFormaPago(clave: string): Promise<boolean> {
    return this.repo.validateFormaPago(clave);
  }

  async validateRegimenFiscal(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean> {
    return this.repo.validateRegimenFiscal(clave, tipoPersona);
  }

  async validateMetodoPago(clave: string): Promise<boolean> {
    return this.repo.validateMetodoPago(clave);
  }

  async validateTipoRelacion(clave: string): Promise<boolean> {
    return this.repo.validateTipoRelacion(clave);
  }

  async assertValidClaveProdServ(clave: string): Promise<void> {
    const isValid = await this.validateClaveProdServ(clave);
    if (!isValid) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'CATALOGO_CLAVE_INVALIDA',
        `La clave ${clave} no es válida en el catálogo c_ClaveProdServ`,
      );
    }
  }

  // Bulk validation
  async validateManyClavesProdServ(claves: string[]): Promise<string[]> {
    if (!claves || claves.length === 0) return [];
    return this.repo.validateManyClavesProdServ(claves);
  }
}
