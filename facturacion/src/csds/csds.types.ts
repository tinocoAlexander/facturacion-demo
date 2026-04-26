export interface Csd {
  id: string;
  empresa_id: string;
  no_certificado: string;
  cer_cifrado: Buffer;
  key_cifrado: Buffer;
  password_cifrado: Buffer;
  iv_cer: Buffer;
  iv_key: Buffer;
  iv_password: Buffer;
  fecha_inicio_vigencia: Date;
  fecha_fin_vigencia: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MulterFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}
