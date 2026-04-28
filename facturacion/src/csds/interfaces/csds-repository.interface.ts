import { Csd } from '../csds.types';

export const I_CSD_REPOSITORY = 'I_CSD_REPOSITORY';

export interface CreateCsdData {
  empresa_id: string;
  no_certificado: string;
  cer_cifrado: Buffer;
  key_cifrado: Buffer;
  password_cifrado: Buffer;
  iv_cer: Buffer;
  iv_key: Buffer;
  iv_password: Buffer;
  key_version: number;
  fecha_inicio_vigencia: Date;
  fecha_fin_vigencia: Date;
}

export interface ICsdRepository {
  findActiveByEmpresa(empresaId: string): Promise<Csd | null>;
  findById(id: string, empresaId: string): Promise<Csd | null>;
  create(data: CreateCsdData): Promise<Csd>;
  setActive(id: string, empresaId: string): Promise<void>;
  findAllByEmpresa(
    empresaId: string,
    limit: number,
    offset: number,
  ): Promise<Csd[]>;
  countAllByEmpresa(empresaId: string): Promise<number>;
  checkNoCertificadoExists(noCertificado: string): Promise<boolean>;
}
