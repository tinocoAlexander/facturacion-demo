import { Empresa } from './empresas.types';
import { ResponseEmpresaDto } from './dtos/response-empresa.dto';

export function mapToResponseEmpresaDto(empresa: Empresa): ResponseEmpresaDto {
  return {
    id: empresa.id,
    rfc: empresa.rfc,
    nombre_comercial: empresa.nombre_comercial,
    razon_social: empresa.razon_social,
    regimen_fiscal: empresa.regimen_fiscal,
    codigo_postal: empresa.codigo_postal,
    email_contacto: empresa.email_contacto,
    telefono: empresa.telefono,
    logo_url: empresa.logo_url,
    is_active: empresa.is_active,
    created_at: empresa.created_at,
    updated_at: empresa.updated_at,
  };
}
