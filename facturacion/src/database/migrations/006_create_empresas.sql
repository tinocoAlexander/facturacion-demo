BEGIN;

CREATE TABLE IF NOT EXISTS empresas (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  rfc               VARCHAR(13)   UNIQUE NOT NULL,
  nombre_comercial  VARCHAR(255)  NOT NULL,
  razon_social      VARCHAR(255)  NOT NULL,
  regimen_fiscal    VARCHAR(3)    NOT NULL,
  codigo_postal     VARCHAR(5)    NOT NULL,
  email_contacto    VARCHAR(255),
  telefono          VARCHAR(20),
  logo_url          TEXT,
  is_active         BOOLEAN       NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresas_rfc 
  ON empresas(rfc);
CREATE INDEX IF NOT EXISTS idx_empresas_active 
  ON empresas(is_active) WHERE is_active = true;

-- Reusar la función update_updated_at() que ya existe desde migration 002
-- (Note: user prompt says 002, my previous exploration said 001/002, 
-- but I will use the function name exactly as requested or as it exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'empresas_updated_at') THEN
    CREATE TRIGGER empresas_updated_at
      BEFORE UPDATE ON empresas
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

COMMIT;
