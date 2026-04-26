import { Injectable } from '@nestjs/common';
import { TicketsIngestService } from './services/tickets-ingest.service';
import { TicketsQueryService } from './services/tickets-query.service';
import { TicketsStateService } from './services/tickets-state.service';
import { IngestTicketDto, QueryTicketDto } from './dtos';
import { Ticket, TicketWithItems, TicketStats } from './tickets.types';

@Injectable()
export class TicketsService {
  constructor(
    private readonly ingestService: TicketsIngestService,
    private readonly queryService: TicketsQueryService,
    private readonly stateService: TicketsStateService,
  ) {}

  async ingestTicket(
    empresaId: string,
    userId: number,
    dto: IngestTicketDto,
  ): Promise<TicketWithItems> {
    return this.ingestService.ingestTicket(empresaId, userId, dto);
  }

  async findAll(
    empresaId: string,
    query: QueryTicketDto,
  ): Promise<{ data: Ticket[]; total: number }> {
    return this.queryService.findAllByEmpresa(empresaId, query);
  }

  async findById(id: string, empresaId: string): Promise<TicketWithItems> {
    return this.queryService.findByIdAndEmpresa(id, empresaId);
  }

  async getStats(empresaId: string): Promise<TicketStats> {
    return this.queryService.getStats(empresaId);
  }

  async anularTicket(
    id: string,
    empresaId: string,
    userId: number,
  ): Promise<void> {
    return this.stateService.anularTicket(id, empresaId, userId);
  }
}
