export const REFRESH_TOKEN_QUERIES = {
  INSERT: `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id
  `,

  FIND_BY_HASH: `
    SELECT id, user_id, token_hash, replaced_by_hash, revoked_at, expires_at, created_at
    FROM refresh_tokens
    WHERE token_hash = $1
    LIMIT 1
  `,

  REVOKE: `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = $1
      AND revoked_at IS NULL
  `,

  ROTATE: `
    UPDATE refresh_tokens
    SET revoked_at = NOW(), replaced_by_hash = $2
    WHERE token_hash = $1
      AND revoked_at IS NULL
  `,

  REVOKE_ALL_FOR_USER: `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = $1
      AND revoked_at IS NULL
  `,
} as const;
