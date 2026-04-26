export const USER_QUERIES = {
  FIND_BY_EMAIL: `
    SELECT id, email, password_hash, full_name, role, is_active,
           created_at, updated_at, last_login_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `,

  FIND_BY_ID: `
    SELECT id, email, full_name, role, is_active,
           created_at, updated_at, last_login_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `,

  FIND_ACTIVE_BY_EMAIL: `
    SELECT id, email, password_hash, full_name, role, is_active,
           created_at, updated_at, last_login_at
    FROM users
    WHERE email = $1
      AND is_active = true
    LIMIT 1
  `,

  CREATE: `
    INSERT INTO users (email, password_hash, full_name)
    VALUES ($1, $2, $3)
    RETURNING id, email, full_name, role, is_active, created_at, updated_at
  `,

  UPDATE_LAST_LOGIN: `
    UPDATE users
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `,

  EMAIL_EXISTS: `
    SELECT 1 FROM users WHERE email = $1 LIMIT 1
  `,

  UPDATE_PROFILE: `
    UPDATE users
    SET full_name = $1
    WHERE id = $2
      AND is_active = true
    RETURNING id, email, full_name, role, is_active,
              last_login_at, created_at, updated_at
  `,

  CHANGE_PASSWORD: `
    UPDATE users
    SET password_hash = $1
    WHERE id = $2
      AND is_active = true
    RETURNING id
  `,

  SET_ACTIVE_STATUS: `
    UPDATE users
    SET is_active = $1
    WHERE id = $2
    RETURNING id, email, full_name, role, is_active,
              last_login_at, created_at, updated_at
  `,

  SET_ROLE: `
    UPDATE users
    SET role = $1
    WHERE id = $2
    RETURNING id, email, full_name, role, is_active,
              last_login_at, created_at, updated_at
  `,

  FIND_ALL_PAGINATED: `
    SELECT id, email, full_name, role, is_active,
           last_login_at, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,

  COUNT_ALL: `
    SELECT COUNT(*)::int AS total FROM users
  `,
} as const;
