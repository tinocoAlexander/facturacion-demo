import {
  BaseCatalogo,
  ClaveUnidad,
  UsoCfdi,
  RegimenFiscal,
} from './catalogos.types';
import { ResponseCatalogoDto } from './dtos';

type FullCatalogo = BaseCatalogo &
  Partial<ClaveUnidad> &
  Partial<UsoCfdi> &
  Partial<RegimenFiscal>;

export function mapToResponseCatalogoDto(
  catalogo: BaseCatalogo,
): ResponseCatalogoDto {
  const cat = catalogo as FullCatalogo;
  return {
    clave: catalogo.clave,
    descripcion: catalogo.descripcion,
    nombre: cat.nombre ?? undefined,
    nota: cat.nota ?? undefined,
    aplica_fisica: cat.aplica_fisica ?? undefined,
    aplica_moral: cat.aplica_moral ?? undefined,
  };
}
