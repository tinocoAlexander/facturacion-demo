import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsNumber,
  Min,
  IsOptional,
  Max,
  Length,
  MinLength,
  IsIn,
  IsInt,
} from 'class-validator';

export class IngestTicketItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  descripcion!: string;

  @IsNumber()
  @Min(0.001)
  cantidad!: number;

  @IsNumber()
  @Min(0)
  precio_unitario!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  descuento: number = 0;

  // NOTA: Calculado por el servidor (se ignora el valor enviado por el cliente)
  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  tasa_iva!: number;

  // NOTA: Calculado por el servidor (se ignora el valor enviado por el cliente)
  @IsNumber()
  @Min(0)
  @IsOptional()
  importe_iva?: number;

  @IsString()
  @Length(8, 8)
  clave_prod_serv!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3)
  clave_unidad!: string;

  @IsString()
  @IsIn(['01', '02', '03'])
  @IsOptional()
  objeto_imp?: string = '02';

  @IsInt()
  @Min(1)
  @IsOptional()
  posicion?: number;
}
