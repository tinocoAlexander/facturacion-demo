import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseCatalogoDto {
  @ApiProperty()
  clave!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiPropertyOptional()
  nombre?: string;

  @ApiPropertyOptional()
  nota?: string;

  @ApiPropertyOptional()
  aplica_fisica?: boolean;

  @ApiPropertyOptional()
  aplica_moral?: boolean;
}
