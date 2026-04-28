import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEmpresaDto } from './create-empresa.dto';

export class UpdateEmpresaDto extends PartialType(
  OmitType(CreateEmpresaDto, ['rfc'] as const),
) {}
