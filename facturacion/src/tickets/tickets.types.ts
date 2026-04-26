export type TicketEstado = 'pendiente' | 'facturado' | 'en_global' | 'anulado';

export interface TicketItem {
  id: string;
  ticket_id: string;
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
  created_at: Date;
}

export interface Ticket {
  id: string;
  empresa_id: string;
  folio_externo: string;
  fecha_venta: Date;
  subtotal: number;
  total_iva: number;
  total: number;
  forma_pago: string;
  moneda: string;
  tipo_cambio: number;
  estado: TicketEstado;
  notas: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

export interface TicketWithItems extends Ticket {
  items: TicketItem[];
}

export interface TicketForGlobal {
  id: string;
  subtotal: number;
  total_iva: number;
  total: number;
  forma_pago: string;
  items: TicketItem[];
}

export interface TicketStats {
  pendientes: number;
  facturados: number;
  en_global: number;
  anulados: number;
  monto_total: number;
  monto_hoy: number;
}
