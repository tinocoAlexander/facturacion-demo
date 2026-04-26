import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';
import { I_TICKETS_REPOSITORY } from '../interfaces/tickets-repository.interface';
import type { ITicketsRepository } from '../interfaces/tickets-repository.interface';
import { PoolClient } from 'pg';
import { TicketForGlobal } from '../tickets.types';
import { httpError } from '../../common/errors/http-error';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class TicketsStateService {
  private readonly logger = new Logger(TicketsStateService.name);

  constructor(
    @Inject(I_TICKETS_REPOSITORY) private readonly repo: ITicketsRepository,
    private readonly auditService: AuditService,
  ) {}

  async markAsFacturado(
    ticketId: string,
    empresaId: string,
    client?: PoolClient,
  ): Promise<void> {
    const ticket = await this.repo.checkTicketFacturable(
      ticketId,
      empresaId,
      client,
    );
    if (!ticket) {
      throw httpError(
        HttpStatus.CONFLICT,
        'TICKET_ALREADY_FACTURADO',
        'El ticket no está pendiente o ya fue facturado',
      );
    }
    await this.repo.updateEstado(ticketId, empresaId, 'facturado', client);
    // Not auditing here, usually CFDI module logs its own events.
  }

  async markManyAsEnGlobal(
    ticketIds: string[],
    empresaId: string,
    client: PoolClient,
  ): Promise<void> {
    if (ticketIds.length === 0) return;
    await this.repo.updateManyEstado(ticketIds, empresaId, 'en_global', client);
  }

  async getPendingForGlobal(
    empresaId: string,
    fecha: Date,
    client: PoolClient,
  ): Promise<TicketForGlobal[]> {
    return this.repo.getPendingForGlobal(empresaId, fecha, client);
  }

  async anularTicket(
    ticketId: string,
    empresaId: string,
    userId: number,
  ): Promise<void> {
    // Para anular, requerimos estar en estado 'pendiente'
    const ticket = await this.repo.checkTicketFacturable(ticketId, empresaId);
    if (!ticket) {
      throw httpError(
        HttpStatus.CONFLICT,
        'TICKET_NO_ANULABLE',
        'El ticket no existe o ya no está en estado pendiente',
      );
    }

    await this.repo.updateEstado(ticketId, empresaId, 'anulado');

    await this.auditService.log('TICKET_ANULADO', {
      actorUserId: userId,
      metadata: {
        empresaId,
        entidad: 'tickets',
        entidadId: ticketId,
        anterior: 'pendiente',
        nuevo: 'anulado',
      },
    });
  }
}
