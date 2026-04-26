export const AUDIT_QUERIES = {
  INSERT: `
    INSERT INTO audit_logs (actor_user_id, action, target_user_id, ip, user_agent, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
  `,
} as const;
