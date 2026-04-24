BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL          PRIMARY KEY,
  email         VARCHAR(255)    UNIQUE NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  full_name     VARCHAR(255)    NOT NULL,
  role          VARCHAR(50)     NOT NULL DEFAULT 'user',
  is_active     BOOLEAN         NOT NULL DEFAULT true,
  last_login_at TIMESTAMP       WITH TIME ZONE,
  created_at    TIMESTAMP       WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP       WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active     ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);

COMMIT;