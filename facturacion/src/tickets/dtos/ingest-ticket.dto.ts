import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  Length,
  IsISO8601,
  IsObject,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IngestTicketItemDto } from './ingest-ticket-item.dto';

export class IngestTicketDto {
  @IsString()
  @MaxLength(100)
  @IsNotEmpty()
  folio_externo!: string;

  @IsISO8601()
  @IsNotEmpty()
  fecha_venta!: string;

  // NOTA: Calculado por el servidor (se ignora el valor enviado por el cliente)
  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  // NOTA: Calculado por el servidor (se ignora el valor enviado por el cliente)
  @IsNumber()
  @Min(0)
  @IsOptional()
  total_iva?: number;

  // NOTA: Calculado por el servidor (se ignora el valor enviado por el cliente)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  total?: number;

  @IsString()
  @Length(2, 2)
  forma_pago!: string;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  moneda?: string = 'MXN';

  @IsNumber()
  @Min(0)
  @IsOptional()
  tipo_cambio?: number = 1.0;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  notas?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => IngestTicketItemDto)
  items!: IngestTicketItemDto[];
}
