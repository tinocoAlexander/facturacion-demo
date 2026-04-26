import {
  Injectable,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database/database.constants';
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
import * as queries from '../database/queries/tickets.queries';

@Injectable()
export class TicketsRepository implements ITicketsRepository {
  private readonly logger = new Logger(TicketsRepository.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findByIdAndEmpresa(
    id: string,
    empresaId: string,
  ): Promise<TicketWithItems | null> {
    try {
      const { rows } = await this.pool.query(queries.FIND_BY_ID_AND_EMPRESA, [
        id,
        empresaId,
      ]);
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
        queries.FIND_BY_FOLIO_EXTERNO_AND_EMPRESA,
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

  async findAllByEmpresa(
    empresaId: string,
    limit: number,
    offset: number,
    estado?: TicketEstado,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<{ data: Ticket[]; total: number }> {
    try {
      let query = `SELECT *, COUNT(*) OVER() as _total FROM tickets WHERE empresa_id = $1`;
      const params: any[] = [empresaId];
      let paramIndex = 2;

      if (estado) {
        query += ` AND estado = $${paramIndex++}`;
        params.push(estado);
      }
      if (fechaInicio) {
        query += ` AND fecha_venta >= $${paramIndex++}`;
        params.push(fechaInicio);
      }
      if (fechaFin) {
        query += ` AND fecha_venta <= $${paramIndex++}`;
        params.push(fechaFin);
      }

      query += ` ORDER BY fecha_venta DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const { rows } = await this.pool.query(query, params);
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
      const { rows } = await db.query(queries.CHECK_TICKET_FACTURABLE, [
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
      const { rows } = await client.query(queries.GET_PENDING_FOR_GLOBAL, [
        empresaId,
        fecha,
      ]);
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
      await db.query(queries.UPDATE_ESTADO, [estado, id, empresaId]);
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
      await client.query(queries.UPDATE_MANY_ESTADO, [estado, ids, empresaId]);
    } catch (error) {
      this.logger.error('Error en updateManyEstado', (error as Error).message);
      throw new InternalServerErrorException(
        'Error al actualizar estados en lote',
      );
    }
  }

  async statsByEmpresa(empresaId: string): Promise<TicketStats> {
    try {
      const { rows } = await this.pool.query(queries.STATS_BY_EMPRESA, [
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
      const ticketRes = await client.query(
        `INSERT INTO tickets (
          empresa_id, folio_externo, fecha_venta, subtotal, total_iva, total, 
          forma_pago, moneda, tipo_cambio, estado, notas, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
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
        ],
      );
      const insertedTicket = ticketRes.rows[0] as Ticket;

      // Insert Items
      const values: any[] = [];
      const placeholders: string[] = [];
      let i = 1;

      for (const item of items) {
        placeholders.push(
          `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`,
        );
        values.push(
          insertedTicket.id,
          item.descripcion,
          item.cantidad,
          item.precio_unitario,
          item.descuento,
          item.subtotal,
          item.tasa_iva,
          item.importe_iva,
          item.clave_prod_serv,
          item.clave_unidad,
          item.objeto_imp,
          item.posicion,
        );
      }

      await client.query(
        `INSERT INTO ticket_items (
          ticket_id, descripcion, cantidad, precio_unitario, descuento, subtotal,
          tasa_iva, importe_iva, clave_prod_serv, clave_unidad, objeto_imp, posicion
        ) VALUES ${placeholders.join(', ')}`,
        values,
      );

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
