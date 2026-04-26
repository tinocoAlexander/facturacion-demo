import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';
import { I_TICKETS_REPOSITORY } from '../interfaces/tickets-repository.interface';
import type { ITicketsRepository } from '../interfaces/tickets-repository.interface';
import { QueryTicketDto } from '../dtos';
import { Ticket, TicketWithItems, TicketStats } from '../tickets.types';
import { httpError } from '../../common/errors/http-error';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

@Injectable()
export class TicketsQueryService {
  private readonly logger = new Logger(TicketsQueryService.name);

  constructor(
    @Inject(I_TICKETS_REPOSITORY) private readonly repo: ITicketsRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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

    // Attempt cache read
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as TicketStats;
      }
    } catch (error) {
      this.logger.warn(
        'Error leyendo caché de stats en Redis',
        (error as Error).message,
      );
    }

    const stats = await this.repo.statsByEmpresa(empresaId);

    // Write to cache (5 min TTL)
    try {
      await this.redis.set(cacheKey, JSON.stringify(stats), 'EX', 300);
    } catch (error) {
      this.logger.warn(
        'Error escribiendo caché de stats en Redis',
        (error as Error).message,
      );
    }

    return stats;
  }
}
