import { ApiProperty } from '@nestjs/swagger';

export class ResponseCsdDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  empresa_id!: string;

  @ApiProperty()
  no_certificado!: string;

  @ApiProperty()
  fecha_inicio_vigencia!: Date;

  @ApiProperty()
  fecha_fin_vigencia!: Date;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
