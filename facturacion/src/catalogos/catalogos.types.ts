export interface BaseCatalogo {
  id: number;
  clave: string;
  descripcion: string;
  activo: boolean;
  created_at: Date;
}

export type ClaveProdServ = BaseCatalogo;

export interface ClaveUnidad extends BaseCatalogo {
  nombre: string | null;
  nota: string | null;
}

export interface UsoCfdi extends BaseCatalogo {
  aplica_fisica: boolean;
  aplica_moral: boolean;
}

export type FormaPago = BaseCatalogo;

export interface RegimenFiscal extends BaseCatalogo {
  aplica_fisica: boolean;
  aplica_moral: boolean;
}

export type MetodoPago = BaseCatalogo;

export type TipoRelacion = BaseCatalogo;
