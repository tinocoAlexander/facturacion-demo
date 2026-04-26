import { Csd } from './csds.types';
import { ResponseCsdDto } from './dtos';

export function mapToResponseCsdDto(csd: Csd): ResponseCsdDto {
  return {
    id: csd.id,
    empresa_id: csd.empresa_id,
    no_certificado: csd.no_certificado,
    fecha_inicio_vigencia: csd.fecha_inicio_vigencia,
    fecha_fin_vigencia: csd.fecha_fin_vigencia,
    is_active: csd.is_active,
    created_at: csd.created_at,
    updated_at: csd.updated_at,
  };
}
