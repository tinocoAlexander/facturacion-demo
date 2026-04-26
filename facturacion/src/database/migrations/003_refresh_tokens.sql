BEGIN;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash        VARCHAR(64) UNIQUE NOT NULL,
  replaced_by_hash  VARCHAR(64),
  revoked_at        TIMESTAMP WITH TIME ZONE,
  expires_at        TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked_at);

COMMIT;
