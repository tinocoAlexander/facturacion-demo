import {
  ClaveProdServ,
  ClaveUnidad,
  UsoCfdi,
  FormaPago,
  RegimenFiscal,
  MetodoPago,
  TipoRelacion,
} from '../catalogos.types';

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
  upsertBatchClaveProdServ(data: any[]): Promise<void>;
  upsertBatchClaveUnidad(data: any[]): Promise<void>;
  upsertBatchUsoCfdi(data: any[]): Promise<void>;
  upsertBatchFormaPago(data: any[]): Promise<void>;
  upsertBatchRegimenFiscal(data: any[]): Promise<void>;
  upsertBatchMetodoPago(data: any[]): Promise<void>;
  upsertBatchTipoRelacion(data: any[]): Promise<void>;
}
