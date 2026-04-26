-- Índice parcial para optimizar la limpieza de tokens expirados
-- Solo indexamos tokens que no han sido revocados, ya que los revocados 
-- suelen ser una fracción menor y se limpian por fecha de revocación.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup 
ON refresh_tokens(expires_at) 
WHERE revoked_at IS NULL;
