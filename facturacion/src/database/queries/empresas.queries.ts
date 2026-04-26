export const EMPRESA_QUERIES = {
  FIND_BY_ID: `
    SELECT id, rfc, nombre_comercial, razon_social, regimen_fiscal,
           codigo_postal, email_contacto, telefono, logo_url, is_active,
           created_at, updated_at
    FROM empresas
    WHERE id = $1
    LIMIT 1
  `,

  FIND_BY_RFC: `
    SELECT id, rfc, nombre_comercial, razon_social, regimen_fiscal,
           codigo_postal, email_contacto, telefono, logo_url, is_active,
           created_at, updated_at
    FROM empresas
    WHERE rfc = $1
    LIMIT 1
  `,

  RFC_EXISTS: `
    SELECT 1 FROM empresas WHERE rfc = $1 LIMIT 1
  `,

  FIND_BY_USER: `
    SELECT e.id, e.rfc, e.nombre_comercial, e.razon_social, e.regimen_fiscal,
           e.codigo_postal, e.email_contacto, e.telefono, e.logo_url, e.is_active,
           e.created_at, e.updated_at
    FROM empresas e
    INNER JOIN users u ON u.empresa_id = e.id
    WHERE u.id = $1
    LIMIT 1
  `,

  CREATE: `
    INSERT INTO empresas (
      rfc, nombre_comercial, razon_social, regimen_fiscal,
      codigo_postal, email_contacto, telefono, logo_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, rfc, nombre_comercial, razon_social, regimen_fiscal,
              codigo_postal, email_contacto, telefono, logo_url, is_active,
              created_at, updated_at
  `,

  UPDATE: `
    UPDATE empresas
    SET nombre_comercial = COALESCE($1, nombre_comercial),
        razon_social = COALESCE($2, razon_social),
        regimen_fiscal = COALESCE($3, regimen_fiscal),
        codigo_postal = COALESCE($4, codigo_postal),
        email_contacto = COALESCE($5, email_contacto),
        telefono = COALESCE($6, telefono),
        logo_url = COALESCE($7, logo_url),
        updated_at = NOW()
    WHERE id = $8
    RETURNING id, rfc, nombre_comercial, razon_social, regimen_fiscal,
              codigo_postal, email_contacto, telefono, logo_url, is_active,
              created_at, updated_at
  `,

  SET_ACTIVE: `
    UPDATE empresas
    SET is_active = $1,
        updated_at = NOW()
    WHERE id = $2
    RETURNING id, rfc, nombre_comercial, razon_social, regimen_fiscal,
              codigo_postal, email_contacto, telefono, logo_url, is_active,
              created_at, updated_at
  `,

  FIND_ALL_PAGINATED: `
    SELECT id, rfc, nombre_comercial, razon_social, regimen_fiscal,
           codigo_postal, email_contacto, telefono, logo_url, is_active,
           created_at, updated_at
    FROM empresas
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `,

  COUNT_ALL: `
    SELECT COUNT(*)::int AS total FROM empresas
  `,

  ASSIGN_USER: `
    UPDATE users SET empresa_id = $1 WHERE id = $2
  `,

  REMOVE_USER: `
    UPDATE users SET empresa_id = NULL WHERE id = $1 AND empresa_id = $2
  `,
} as const;
