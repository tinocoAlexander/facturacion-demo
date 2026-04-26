BEGIN;

-- c_ClaveProdServ
CREATE TABLE IF NOT EXISTS c_clave_prod_serv (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_clave_prod_serv_activo ON c_clave_prod_serv(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_c_clave_prod_serv_fts ON c_clave_prod_serv USING GIN (to_tsvector('spanish', descripcion));

-- c_ClaveUnidad
CREATE TABLE IF NOT EXISTS c_clave_unidad (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(100),
  descripcion VARCHAR(500) NOT NULL,
  nota TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_clave_unidad_activo ON c_clave_unidad(activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_c_clave_unidad_fts ON c_clave_unidad USING GIN (to_tsvector('spanish', descripcion));

-- c_UsoCFDI
CREATE TABLE IF NOT EXISTS c_uso_cfdi (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  aplica_fisica BOOLEAN DEFAULT true,
  aplica_moral BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_uso_cfdi_activo ON c_uso_cfdi(activo) WHERE activo = true;

-- c_FormaPago
CREATE TABLE IF NOT EXISTS c_forma_pago (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_forma_pago_activo ON c_forma_pago(activo) WHERE activo = true;

-- c_RegimenFiscal
CREATE TABLE IF NOT EXISTS c_regimen_fiscal (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  aplica_fisica BOOLEAN DEFAULT true,
  aplica_moral BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_regimen_fiscal_activo ON c_regimen_fiscal(activo) WHERE activo = true;

-- c_MetodoPago
CREATE TABLE IF NOT EXISTS c_metodo_pago (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_metodo_pago_activo ON c_metodo_pago(activo) WHERE activo = true;

-- c_TipoRelacion
CREATE TABLE IF NOT EXISTS c_tipo_relacion (
  id SERIAL PRIMARY KEY,
  clave VARCHAR(10) NOT NULL UNIQUE,
  descripcion VARCHAR(500) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_c_tipo_relacion_activo ON c_tipo_relacion(activo) WHERE activo = true;

COMMIT;
