import { Injectable, Inject, Logger, HttpStatus } from '@nestjs/common';
import { I_TICKETS_REPOSITORY } from '../interfaces/tickets-repository.interface';
import type { ITicketsRepository } from '../interfaces/tickets-repository.interface';
import { IngestTicketDto } from '../dtos';
import { TicketWithItems } from '../tickets.types';
import { CatalogosService } from '../../catalogos/catalogos.service';
import { AuditService } from '../../audit/audit.service';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class TicketsIngestService {
  private readonly logger = new Logger(TicketsIngestService.name);

  constructor(
    @Inject(I_TICKETS_REPOSITORY) private readonly repo: ITicketsRepository,
    private readonly catalogosService: CatalogosService,
    private readonly auditService: AuditService,
  ) {}

  async ingestTicket(
    empresaId: string,
    userId: number,
    dto: IngestTicketDto,
  ): Promise<TicketWithItems> {
    // Paso 1: Validar idempotencia
    const existing = await this.repo.findByFolioExternoAndEmpresa(
      dto.folio_externo,
      empresaId,
    );
    if (existing) {
      this.logger.log(
        `Ticket con folio ${dto.folio_externo} ya existe. Retornando el existente (Idempotencia).`,
      );
      const fullTicket = await this.repo.findByIdAndEmpresa(
        existing.id,
        empresaId,
      );
      if (!fullTicket) {
        throw httpError(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'INTERNAL_ERROR',
          'Ticket existente no encontrado',
        );
      }
      return fullTicket;
    }

    // Paso 2: Validar claves SAT
    if (!(await this.catalogosService.validateFormaPago(dto.forma_pago))) {
      throw httpError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'TICKET_FORMA_PAGO_INVALIDA',
        `La forma de pago ${dto.forma_pago} no es válida`,
      );
    }

    let pos = 1;
    for (const item of dto.items) {
      if (
        !(await this.catalogosService.validateClaveProdServ(
          item.clave_prod_serv,
        ))
      ) {
        throw httpError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'TICKET_CLAVE_PROD_INVALIDA',
          `La clave ${item.clave_prod_serv} del item ${pos} no existe en el catálogo SAT`,
        );
      }
      if (
        !(await this.catalogosService.validateClaveUnidad(item.clave_unidad))
      ) {
        throw httpError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'TICKET_CLAVE_UNIDAD_INVALIDA',
          `La clave de unidad ${item.clave_unidad} del item ${pos} no existe en el catálogo SAT`,
        );
      }
      item.posicion = item.posicion ?? pos;
      pos++;
    }

    // Paso 3: Calcular montos server-side (ignorando los del cliente)
    let calcSubtotal = 0;
    let calcTotalIva = 0;

    for (const item of dto.items) {
      // Usar Math.round(valor * 100) / 100 para evitar imprecisiones de coma flotante
      const itemSubtotal =
        Math.round(
          (item.cantidad * item.precio_unitario - (item.descuento || 0)) * 100,
        ) / 100;
      const itemIva = Math.round(itemSubtotal * item.tasa_iva * 100) / 100;

      // Sobreescribir con valores autoritativos
      item.subtotal = itemSubtotal;
      item.importe_iva = itemIva;

      calcSubtotal += itemSubtotal;
      calcTotalIva += itemIva;
    }

    // Sobreescribir totales del ticket
    dto.subtotal = Math.round(calcSubtotal * 100) / 100;
    dto.total_iva = Math.round(calcTotalIva * 100) / 100;
    dto.total = Math.round((dto.subtotal + dto.total_iva) * 100) / 100;

    // Paso 4: Guardar en transacción
    try {
      const ticketToSave = {
        empresa_id: empresaId,
        folio_externo: dto.folio_externo,
        fecha_venta: new Date(dto.fecha_venta),
        subtotal: dto.subtotal,
        total_iva: dto.total_iva,
        total: dto.total,
        forma_pago: dto.forma_pago,
        moneda: dto.moneda || 'MXN',
        tipo_cambio: dto.tipo_cambio || 1.0,
        estado: 'pendiente' as const,
        notas: dto.notas || null,
        metadata: dto.metadata || null,
      };

      const savedTicket = await this.repo.insertTicketWithItems(
        ticketToSave,
        dto.items.map((i) => ({
          ...i,
          descuento: i.descuento || 0,
          objeto_imp: i.objeto_imp || '02',
          posicion: i.posicion as number,
          subtotal: i.subtotal as number,
          importe_iva: i.importe_iva as number,
        })),
      );

      await this.auditService.log('TICKET_INGESTED', {
        actorUserId: userId,
        metadata: {
          empresaId,
          entidad: 'tickets',
          entidadId: savedTicket.id,
          folio_externo: dto.folio_externo,
          total: dto.total,
        },
      });

      return savedTicket;
    } catch (error: unknown) {
      // Manejo de condición de carrera para idempotencia (UNIQUE constraint violation)
      if (this.isPostgresError(error) && error.code === '23505') {
        this.logger.log(
          `Condición de carrera detectada. Ticket con folio ${dto.folio_externo} insertado concurrentemente.`,
        );
        const fullTicket = await this.repo.findByFolioExternoAndEmpresa(
          dto.folio_externo,
          empresaId,
        );
        if (fullTicket) {
          const ticket = await this.repo.findByIdAndEmpresa(
            fullTicket.id,
            empresaId,
          );
          if (ticket) return ticket;
        }
      }
      throw error;
    }
  }

  private isPostgresError(
    err: unknown,
  ): err is { code: string; constraint?: string } {
    const maybeError = err as Record<string, unknown>;
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof maybeError.code === 'string'
    );
  }
}
