export const CSD_QUERIES = {
  FIND_ACTIVE_BY_EMPRESA: `
    SELECT id, empresa_id, no_certificado, cer_cifrado, key_cifrado, password_cifrado,
           iv_cer, iv_key, iv_password, fecha_inicio_vigencia, fecha_fin_vigencia,
           is_active, created_at, updated_at
    FROM csds
    WHERE empresa_id = $1 AND is_active = true
    LIMIT 1
  `,

  FIND_BY_ID: `
    SELECT id, empresa_id, no_certificado, cer_cifrado, key_cifrado, password_cifrado,
           iv_cer, iv_key, iv_password, fecha_inicio_vigencia, fecha_fin_vigencia,
           is_active, created_at, updated_at
    FROM csds
    WHERE id = $1 AND empresa_id = $2
    LIMIT 1
  `,

  CREATE: `
    INSERT INTO csds (
      empresa_id, no_certificado, cer_cifrado, key_cifrado, password_cifrado,
      iv_cer, iv_key, iv_password, fecha_inicio_vigencia, fecha_fin_vigencia,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
    RETURNING id, empresa_id, no_certificado, cer_cifrado, key_cifrado, password_cifrado,
              iv_cer, iv_key, iv_password, fecha_inicio_vigencia, fecha_fin_vigencia,
              is_active, created_at, updated_at
  `,

  SET_ACTIVE_DEACTIVATE_ALL: `
    UPDATE csds
    SET is_active = false
    WHERE empresa_id = $1
  `,

  SET_ACTIVE_ACTIVATE_ONE: `
    UPDATE csds
    SET is_active = true
    WHERE id = $1 AND empresa_id = $2
  `,

  FIND_ALL_BY_EMPRESA: `
    SELECT id, empresa_id, no_certificado, fecha_inicio_vigencia, fecha_fin_vigencia,
           is_active, created_at, updated_at
    FROM csds
    WHERE empresa_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,

  COUNT_ALL_BY_EMPRESA: `
    SELECT COUNT(*)::int AS total FROM csds WHERE empresa_id = $1
  `,

  CHECK_NO_CERTIFICADO: `
    SELECT 1 FROM csds WHERE no_certificado = $1 LIMIT 1
  `,
} as const;
