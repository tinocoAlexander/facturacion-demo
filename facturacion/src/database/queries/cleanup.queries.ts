export const CLEANUP_QUERIES = {
  CLEANUP_REFRESH_TOKENS: `
    WITH deleted AS (
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
      RETURNING id
    )
    SELECT COUNT(*)::int AS count FROM deleted;
  `,
} as const;
