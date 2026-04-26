import { PoolClient } from 'pg';
import {
  Ticket,
  TicketWithItems,
  TicketEstado,
  TicketForGlobal,
  TicketStats,
} from '../tickets.types';

export const I_TICKETS_REPOSITORY = 'I_TICKETS_REPOSITORY';

export interface ITicketsRepository {
  findByIdAndEmpresa(
    id: string,
    empresaId: string,
  ): Promise<TicketWithItems | null>;
  findByFolioExternoAndEmpresa(
    folioExterno: string,
    empresaId: string,
  ): Promise<Pick<Ticket, 'id' | 'estado'> | null>;
  findAllByEmpresa(
    empresaId: string,
    limit: number,
    offset: number,
    estado?: TicketEstado,
    fechaInicio?: Date,
    fechaFin?: Date,
  ): Promise<{ data: Ticket[]; total: number }>;

  checkTicketFacturable(
    id: string,
    empresaId: string,
    client?: PoolClient,
  ): Promise<Pick<Ticket, 'id' | 'estado' | 'total' | 'forma_pago'> | null>;
  getPendingForGlobal(
    empresaId: string,
    fecha: Date,
    client: PoolClient,
  ): Promise<TicketForGlobal[]>;

  updateEstado(
    id: string,
    empresaId: string,
    estado: TicketEstado,
    client?: PoolClient,
  ): Promise<void>;
  updateManyEstado(
    ids: string[],
    empresaId: string,
    estado: TicketEstado,
    client: PoolClient,
  ): Promise<void>;

  statsByEmpresa(empresaId: string): Promise<TicketStats>;

  insertTicketWithItems(
    ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<TicketItem, 'id' | 'ticket_id' | 'created_at'>[],
  ): Promise<TicketWithItems>;
}

// Interfaz omitiendo campos db-generated
export interface TicketItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  tasa_iva: number;
  importe_iva: number;
  clave_prod_serv: string;
  clave_unidad: string;
  objeto_imp: string;
  posicion: number;
}
