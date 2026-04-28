import {
  ClaveProdServ,
  ClaveUnidad,
  UsoCfdi,
  FormaPago,
  RegimenFiscal,
  MetodoPago,
  TipoRelacion,
} from '../catalogos.types';

export interface ClaveProdServRow {
  c_ClaveProdServ: string;
  Descripción: string;
}

export interface ClaveUnidadRow {
  c_ClaveUnidad: string;
  Nombre: string;
  Descripción: string;
  Nota: string;
}

export interface UsoCfdiRow {
  c_UsoCFDI: string;
  Descripción: string;
  Física: string;
  Moral: string;
}

export interface FormaPagoRow {
  c_FormaPago: string;
  Descripción: string;
}

export interface RegimenFiscalRow {
  c_RegimenFiscal: string;
  Descripción: string;
  Física: string;
  Moral: string;
}

export interface MetodoPagoRow {
  c_MetodoPago: string;
  Descripción: string;
}

export interface TipoRelacionRow {
  c_TipoRelacion: string;
  Descripción: string;
}

export const I_CATALOGOS_REPOSITORY = 'I_CATALOGOS_REPOSITORY';

export interface ICatalogosRepository {
  // Búsqueda en general
  searchClaveProdServ(query: string, limit: number): Promise<ClaveProdServ[]>;
  searchClaveUnidad(query: string, limit: number): Promise<ClaveUnidad[]>;

  // Listados completos
  findAllUsoCfdi(): Promise<UsoCfdi[]>;
  findAllFormaPago(): Promise<FormaPago[]>;
  findAllRegimenFiscal(tipo?: 'fisica' | 'moral'): Promise<RegimenFiscal[]>;
  findAllMetodoPago(): Promise<MetodoPago[]>;
  findAllTipoRelacion(): Promise<TipoRelacion[]>;

  // Validaciones
  validateClaveProdServ(clave: string): Promise<boolean>;
  validateClaveUnidad(clave: string): Promise<boolean>;
  validateUsoCfdi(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean>;
  validateFormaPago(clave: string): Promise<boolean>;
  validateRegimenFiscal(
    clave: string,
    tipoPersona?: 'fisica' | 'moral',
  ): Promise<boolean>;
  validateMetodoPago(clave: string): Promise<boolean>;
  validateTipoRelacion(clave: string): Promise<boolean>;

  // Bulk validation
  validateManyClavesProdServ(claves: string[]): Promise<string[]>;

  // Sincronización (batch insert ignoring conflicts)
  upsertBatchClaveProdServ(data: ClaveProdServRow[]): Promise<void>;
  upsertBatchClaveUnidad(data: ClaveUnidadRow[]): Promise<void>;
  upsertBatchUsoCfdi(data: UsoCfdiRow[]): Promise<void>;
  upsertBatchFormaPago(data: FormaPagoRow[]): Promise<void>;
  upsertBatchRegimenFiscal(data: RegimenFiscalRow[]): Promise<void>;
  upsertBatchMetodoPago(data: MetodoPagoRow[]): Promise<void>;
  upsertBatchTipoRelacion(data: TipoRelacionRow[]): Promise<void>;
}
