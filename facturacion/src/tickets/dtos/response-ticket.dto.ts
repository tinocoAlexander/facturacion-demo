import { TicketEstado } from '../tickets.types';

export class ResponseTicketDto {
  id: string;
  folio_externo: string;
  fecha_venta: Date;
  subtotal: string;
  total_iva: string;
  total: string;
  forma_pago: string;
  moneda: string;
  estado: TicketEstado;
  notas: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}
