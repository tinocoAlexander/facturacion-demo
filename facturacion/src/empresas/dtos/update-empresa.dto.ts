import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmpresaDto } from './create-empresa.dto.js';

export class UpdateEmpresaDto extends PartialType(
  OmitType(CreateEmpresaDto, ['rfc'] as const),
) {
  @ApiProperty({ required: false })
  nombre_comercial?: string;

  @ApiProperty({ required: false })
  razon_social?: string;

  @ApiProperty({ required: false })
  regimen_fiscal?: string;

  @ApiProperty({ required: false })
  codigo_postal?: string;

  @ApiProperty({ required: false })
  email_contacto?: string;

  @ApiProperty({ required: false })
  telefono?: string;

  @ApiProperty({ required: false })
  logo_url?: string;
}
