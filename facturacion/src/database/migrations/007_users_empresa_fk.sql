BEGIN;

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_empresa_id 
  ON users(empresa_id) WHERE empresa_id IS NOT NULL;

COMMIT;
