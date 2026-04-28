import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { InjectPool } from '../database/database.constants';
import {
  ITicketsRepository,
  TicketItem as DbTicketItem,
} from './interfaces/tickets-repository.interface';
import {
  Ticket,
  TicketWithItems,
  TicketEstado,
  TicketForGlobal,
  TicketStats,
} from './tickets.types';
import { TICKET_QUERIES } from '../database/queries/tickets.queries';

@Injectable()
export class TicketsRepository implements ITicketsRepository {
  private readonly logger = new Logger(TicketsRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async findByIdAndEmpresa(
    id: string,
    empresaId: string,
  ): Promise<TicketWithItems | null> {
    try {
      const { rows } = await this.pool.query(
        TICKET_QUERIES.FIND_BY_ID_AND_EMPRESA,
        [id, empresaId],
      );
      if (rows.length === 0) return null;
      return rows[0] as TicketWithItems;
    } catch (error) {
      this.logger.error(
        'Error en findByIdAndEmpresa',
        (error as Error).message,
      );
      throw new InternalServerErrorException('Error al consultar ticket');
    }
  }

  async findByFolioExternoAndEmpresa(
    folioExterno: string,
    empresaId: string,
  ): Promise<Pick<Ticket, 'id' | 'estado'> | null> {
    try {
      const { rows } = await this.pool.query(
        TICKET_QUERIES.FIND_BY_FOLIO_EXTERNO_AND_EMPRESA,
        [folioExterno, empresaId],
      );
      if (rows.length === 0) return null;
      return rows[0] as Pick<Ticket, 'id' | 'estado'>;
    } catch (error) {
      this.logger.error(
        'Error en findByFolioExternoAndEmpresa',
        (error as Error).message,
      );
      throw new InternalServerErrorException(
        'Error al buscar ticket por folio',
      );
    }
  }

  private buildFindAllQuery(params: {
    empresaId: string;
    estado?: TicketEstado;
    fechaInicio?: Date;
    fechaFin?: Date;
    limit: number;
    offset: number;
  }): { text: string; values: (string | number | Date)[] } {
    const conditions: string[] = ['empresa_id = $1'];
    const values: (string | number | Date)[] = [params.empresaId];
    let idx = 2;

    if (params.estado) {
      conditions.push(`estado = $${idx++}`);
      values.push(params.estado);
    }
    if (params.fechaInicio) {
      conditions.push(`fecha_venta >= $${idx++}`);
      values.push(params.fechaInicio);
    }
    if (params.fechaFin) {
      conditions.push(`fecha_venta <= $${idx++}`);
      values.push(params.fechaFin);
    }

    const where = conditions.join(' AND ');
    values.push(params.limit, params.offset);

    return {
      text: `
        SELECT *, COUNT(*) OVER() AS _total
        FROM tickets
        WHERE ${where}
        ORDER BY fecha_venta DESC
        LIMIT $${idx++} OFFSET $${idx}
      `,
      values,
    };
  }

  async findAllByEmpresa(
    empresaId: string,
    limit: number,
    offset: number,
    estado?: TicketEstado,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<{ data: Ticket[]; total: number }> {
    try {
      const { text, values } = this.buildFindAllQuery({
        empresaId,
        limit,
        offset,
        estado,
        fechaInicio,
        fechaFin,
      });

      const { rows } = await this.pool.query(text, values);
      const total =
        rows.length > 0
          ? Number((rows[0] as Record<string, unknown>)._total)
          : 0;

      const data = rows.map((r) => {
        const ticket = { ...(r as Record<string, unknown>) };
        delete ticket._total;
        return ticket as unknown as Ticket;
      });

      return { data, total };
    } catch (error) {
      this.logger.error('Error en findAllByEmpresa', (error as Error).message);
      throw new InternalServerErrorException('Error al listar tickets');
    }
  }

  async checkTicketFacturable(
    id: string,
    empresaId: string,
    client?: PoolClient,
  ): Promise<Pick<Ticket, 'id' | 'estado' | 'total' | 'forma_pago'> | null> {
    try {
      const db = client || this.pool;
      const { rows } = await db.query(TICKET_QUERIES.CHECK_TICKET_FACTURABLE, [
        id,
        empresaId,
      ]);
      if (rows.length === 0) return null;
      return rows[0] as Pick<Ticket, 'id' | 'estado' | 'total' | 'forma_pago'>;
    } catch (error) {
      this.logger.error(
        'Error en checkTicketFacturable',
        (error as Error).message,
      );
      throw new InternalServerErrorException(
        'Error al validar ticket para facturación',
      );
    }
  }

  async getPendingForGlobal(
    empresaId: string,
    fecha: Date,
    client: PoolClient,
  ): Promise<TicketForGlobal[]> {
    try {
      const { rows } = await client.query(
        TICKET_QUERIES.GET_PENDING_FOR_GLOBAL,
        [empresaId, fecha],
      );
      return rows as TicketForGlobal[];
    } catch (error) {
      this.logger.error(
        'Error en getPendingForGlobal',
        (error as Error).message,
      );
      throw new InternalServerErrorException(
        'Error al consultar tickets pendientes',
      );
    }
  }

  async updateEstado(
    id: string,
    empresaId: string,
    estado: TicketEstado,
    client?: PoolClient,
  ): Promise<void> {
    try {
      const db = client || this.pool;
      await db.query(TICKET_QUERIES.UPDATE_ESTADO, [estado, id, empresaId]);
    } catch (error) {
      this.logger.error('Error en updateEstado', (error as Error).message);
      throw new InternalServerErrorException(
        'Error al actualizar estado del ticket',
      );
    }
  }

  async updateManyEstado(
    ids: string[],
    empresaId: string,
    estado: TicketEstado,
    client: PoolClient,
  ): Promise<void> {
    try {
      await client.query(TICKET_QUERIES.UPDATE_MANY_ESTADO, [
        estado,
        ids,
        empresaId,
      ]);
    } catch (error) {
      this.logger.error('Error en updateManyEstado', (error as Error).message);
      throw new InternalServerErrorException(
        'Error al actualizar estados en lote',
      );
    }
  }

  async statsByEmpresa(empresaId: string): Promise<TicketStats> {
    try {
      const { rows } = await this.pool.query(TICKET_QUERIES.STATS_BY_EMPRESA, [
        empresaId,
      ]);
      const r = rows[0] as Record<string, string | number>;
      return {
        pendientes: Number(r.pendientes),
        facturados: Number(r.facturados),
        en_global: Number(r.en_global),
        anulados: Number(r.anulados),
        monto_total: Number(r.monto_total),
        monto_hoy: Number(r.monto_hoy),
      };
    } catch (error) {
      this.logger.error('Error en statsByEmpresa', (error as Error).message);
      throw new InternalServerErrorException(
        'Error al obtener estadísticas de tickets',
      );
    }
  }

  async insertTicketWithItems(
    ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<DbTicketItem, 'id' | 'ticket_id' | 'created_at'>[],
  ): Promise<TicketWithItems> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert Ticket
      const ticketRes = await client.query(TICKET_QUERIES.INSERT_TICKET, [
        ticket.empresa_id,
        ticket.folio_externo,
        ticket.fecha_venta,
        ticket.subtotal,
        ticket.total_iva,
        ticket.total,
        ticket.forma_pago,
        ticket.moneda,
        ticket.tipo_cambio,
        ticket.estado,
        ticket.notas,
        ticket.metadata,
      ]);
      const insertedTicket = ticketRes.rows[0] as Ticket;

      // Insert Items
      const arrays = {
        descripcion: [] as string[],
        cantidad: [] as number[],
        precio_unitario: [] as number[],
        descuento: [] as number[],
        subtotal: [] as number[],
        tasa_iva: [] as number[],
        importe_iva: [] as number[],
        clave_prod_serv: [] as string[],
        clave_unidad: [] as string[],
        objeto_imp: [] as string[],
        posicion: [] as number[],
      };

      for (const item of items) {
        arrays.descripcion.push(item.descripcion);
        arrays.cantidad.push(item.cantidad);
        arrays.precio_unitario.push(item.precio_unitario);
        arrays.descuento.push(item.descuento);
        arrays.subtotal.push(item.subtotal);
        arrays.tasa_iva.push(item.tasa_iva);
        arrays.importe_iva.push(item.importe_iva);
        arrays.clave_prod_serv.push(item.clave_prod_serv);
        arrays.clave_unidad.push(item.clave_unidad);
        arrays.objeto_imp.push(item.objeto_imp);
        arrays.posicion.push(item.posicion);
      }

      await client.query(TICKET_QUERIES.INSERT_TICKET_ITEMS, [
        insertedTicket.id,
        arrays.descripcion,
        arrays.cantidad,
        arrays.precio_unitario,
        arrays.descuento,
        arrays.subtotal,
        arrays.tasa_iva,
        arrays.importe_iva,
        arrays.clave_prod_serv,
        arrays.clave_unidad,
        arrays.objeto_imp,
        arrays.posicion,
      ]);

      await client.query('COMMIT');

      const res = await this.findByIdAndEmpresa(
        insertedTicket.id,
        ticket.empresa_id,
      );
      return res!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error; // Let the service handle UNIQUE violations
    } finally {
      client.release();
    }
  }
}
