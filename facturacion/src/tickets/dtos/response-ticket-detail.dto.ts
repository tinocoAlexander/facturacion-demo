import { ResponseTicketDto } from './response-ticket.dto';

export class ResponseTicketItemDto {
  id: string;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  descuento: string;
  subtotal: string;
  tasa_iva: string;
  importe_iva: string;
  clave_prod_serv: string;
  clave_unidad: string;
  objeto_imp: string;
  posicion: number;
}

export class ResponseTicketDetailDto extends ResponseTicketDto {
  items: ResponseTicketItemDto[];
}
