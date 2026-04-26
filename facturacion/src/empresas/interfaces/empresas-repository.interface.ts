import { Empresa } from '../empresas.types';

export const I_EMPRESAS_REPOSITORY = 'I_EMPRESAS_REPOSITORY';

export interface CreateEmpresaData {
  rfc: string;
  nombre_comercial: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email_contacto?: string;
  telefono?: string;
  logo_url?: string;
}

export interface UpdateEmpresaData {
  nombre_comercial?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  codigo_postal?: string;
  email_contacto?: string;
  telefono?: string;
  logo_url?: string;
}

export interface IEmpresasRepository {
  findById(id: string): Promise<Empresa | null>;
  findByRfc(rfc: string): Promise<Empresa | null>;
  rfcExists(rfc: string): Promise<boolean>;
  findByUser(userId: number): Promise<Empresa | null>;
  create(data: CreateEmpresaData): Promise<Empresa>;
  update(id: string, data: UpdateEmpresaData): Promise<Empresa | null>;
  setActive(id: string, isActive: boolean): Promise<Empresa | null>;
  findAll(limit: number, offset: number): Promise<Empresa[]>;
  countAll(): Promise<number>;
  assignUser(empresaId: string, userId: number): Promise<void>;
  removeUser(userId: number, empresaId: string): Promise<void>;
}
