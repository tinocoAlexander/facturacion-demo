import { Ticket, TicketWithItems } from './tickets.types';
import {
  ResponseTicketDto,
  ResponseTicketDetailDto,
  ResponseTicketItemDto,
} from './dtos';

export function mapToResponseTicketDto(ticket: Ticket): ResponseTicketDto {
  return {
    id: ticket.id,
    folio_externo: ticket.folio_externo,
    fecha_venta: ticket.fecha_venta,
    subtotal: ticket.subtotal.toString(),
    total_iva: ticket.total_iva.toString(),
    total: ticket.total.toString(),
    forma_pago: ticket.forma_pago,
    moneda: ticket.moneda,
    estado: ticket.estado,
    notas: ticket.notas,
    metadata: ticket.metadata,
    created_at: ticket.created_at,
  };
}

export function mapToResponseTicketDetailDto(
  ticket: TicketWithItems,
): ResponseTicketDetailDto {
  return {
    ...mapToResponseTicketDto(ticket),
    items: ticket.items.map(
      (item): ResponseTicketItemDto => ({
        id: item.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad.toString(),
        precio_unitario: item.precio_unitario.toString(),
        descuento: item.descuento.toString(),
        subtotal: item.subtotal.toString(),
        tasa_iva: item.tasa_iva.toString(),
        importe_iva: item.importe_iva.toString(),
        clave_prod_serv: item.clave_prod_serv,
        clave_unidad: item.clave_unidad,
        objeto_imp: item.objeto_imp,
        posicion: item.posicion,
      }),
    ),
  };
}
