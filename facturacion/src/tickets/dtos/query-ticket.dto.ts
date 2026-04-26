import {
  IsOptional,
  IsEnum,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { TicketEstado } from '../tickets.types';

export class QueryTicketDto {
  @IsOptional()
  @IsEnum(['pendiente', 'facturado', 'en_global', 'anulado'])
  estado?: TicketEstado;

  @IsOptional()
  @IsISO8601()
  fecha_inicio?: string;

  @IsOptional()
  @IsISO8601()
  fecha_fin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
