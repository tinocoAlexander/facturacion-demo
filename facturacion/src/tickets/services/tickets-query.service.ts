import { Injectable, Inject, Logger, HttpStatus, Optional } from '@nestjs/common';
import { I_TICKETS_REPOSITORY } from '../interfaces/tickets-repository.interface';
import type { ITicketsRepository } from '../interfaces/tickets-repository.interface';
import { QueryTicketDto } from '../dtos';
import { Ticket, TicketWithItems, TicketStats } from '../tickets.types';
import { httpError } from '../../common/errors/http-error';
import Redis from 'ioredis';
import { InjectRedis } from '../../redis/redis.constants';

@Injectable()
export class TicketsQueryService {
  private readonly logger = new Logger(TicketsQueryService.name);

  constructor(
    @Inject(I_TICKETS_REPOSITORY) private readonly repo: ITicketsRepository,
    @Optional() @InjectRedis() private readonly redis: Redis | null,
  ) {}

  async findAllByEmpresa(
    empresaId: string,
    query: QueryTicketDto,
  ): Promise<{ data: Ticket[]; total: number }> {
    const limit = query.limit || 20;
    const offset = query.offset || 0;

    return this.repo.findAllByEmpresa(
      empresaId,
      limit,
      offset,
      query.estado,
      query.fecha_inicio ? new Date(query.fecha_inicio) : undefined,
      query.fecha_fin ? new Date(query.fecha_fin) : undefined,
    );
  }

  async findByIdAndEmpresa(
    id: string,
    empresaId: string,
  ): Promise<TicketWithItems> {
    const ticket = await this.repo.findByIdAndEmpresa(id, empresaId);
    if (!ticket) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'TICKET_NOT_FOUND',
        'Ticket no encontrado',
      );
    }
    return ticket;
  }

  async getStats(empresaId: string): Promise<TicketStats> {
    const cacheKey = `tickets:stats:${empresaId}`;
    
    // Intentar leer del cache — falla silenciosamente si Redis no disponible
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as TicketStats;
      } catch (err) {
        this.logger.warn('Redis cache read failed, falling back to DB', 
          (err as Error).message);
      }
    }

    const stats = await this.repo.statsByEmpresa(empresaId);

    // Escribir al cache — falla silenciosamente
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, 300, JSON.stringify(stats));
      } catch (err) {
        this.logger.warn('Redis cache write failed', (err as Error).message);
      }
    }

    return stats;
  }
}
