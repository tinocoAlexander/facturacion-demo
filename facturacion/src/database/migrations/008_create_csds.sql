BEGIN;

CREATE TABLE IF NOT EXISTS csds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  no_certificado VARCHAR(20) UNIQUE NOT NULL,
  cer_cifrado BYTEA NOT NULL,
  key_cifrado BYTEA NOT NULL,
  password_cifrado BYTEA NOT NULL,
  iv_cer BYTEA NOT NULL,
  iv_key BYTEA NOT NULL,
  iv_password BYTEA NOT NULL,
  fecha_inicio_vigencia TIMESTAMPTZ NOT NULL,
  fecha_fin_vigencia TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csds_empresa_id ON csds(empresa_id);
CREATE INDEX IF NOT EXISTS idx_csds_no_certificado ON csds(no_certificado);
CREATE UNIQUE INDEX IF NOT EXISTS idx_csds_single_active ON csds(empresa_id) WHERE is_active = true;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'csds_updated_at') THEN
    CREATE TRIGGER csds_updated_at
      BEFORE UPDATE ON csds
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

COMMIT;
