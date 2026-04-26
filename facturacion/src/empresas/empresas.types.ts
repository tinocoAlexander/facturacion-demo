export interface Empresa {
  id: string; // UUID
  rfc: string;
  nombre_comercial: string;
  razon_social: string;
  regimen_fiscal: string;
  codigo_postal: string;
  email_contacto: string | null;
  telefono: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type PublicEmpresa = Empresa;
