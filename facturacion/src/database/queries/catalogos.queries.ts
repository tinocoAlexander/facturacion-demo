export const CATALOGOS_QUERIES = {
  // --- Búsquedas con Full Text Search (FTS) ---
  SEARCH_CLAVE_PROD_SERV: `
    SELECT id, clave, descripcion, activo, created_at
    FROM c_clave_prod_serv
    WHERE activo = true 
      AND to_tsvector('spanish', descripcion) @@ plainto_tsquery('spanish', $1)
    ORDER BY ts_rank(to_tsvector('spanish', descripcion), plainto_tsquery('spanish', $1)) DESC
    LIMIT $2
  `,

  SEARCH_CLAVE_UNIDAD: `
    SELECT id, clave, nombre, descripcion, nota, activo, created_at
    FROM c_clave_unidad
    WHERE activo = true 
      AND (to_tsvector('spanish', descripcion) @@ plainto_tsquery('spanish', $1) OR clave ILIKE $1 || '%')
    LIMIT $2
  `,

  // --- Listados (Dropdowns) ---
  FIND_ALL_USO_CFDI: `
    SELECT id, clave, descripcion, aplica_fisica, aplica_moral, activo, created_at
    FROM c_uso_cfdi
    WHERE activo = true
    ORDER BY clave ASC
  `,

  FIND_ALL_FORMA_PAGO: `
    SELECT id, clave, descripcion, activo, created_at
    FROM c_forma_pago
    WHERE activo = true
    ORDER BY clave ASC
  `,

  FIND_ALL_REGIMEN_FISCAL: `
    SELECT id, clave, descripcion, aplica_fisica, aplica_moral, activo, created_at
    FROM c_regimen_fiscal
    WHERE activo = true
    ORDER BY clave ASC
  `,

  FIND_ALL_METODO_PAGO: `
    SELECT id, clave, descripcion, activo, created_at
    FROM c_metodo_pago
    WHERE activo = true
    ORDER BY clave ASC
  `,

  FIND_ALL_TIPO_RELACION: `
    SELECT id, clave, descripcion, activo, created_at
    FROM c_tipo_relacion
    WHERE activo = true
    ORDER BY clave ASC
  `,

  // --- Validaciones puntuales ---
  VALIDATE_CLAVE_PROD_SERV: `SELECT 1 FROM c_clave_prod_serv WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_CLAVE_UNIDAD: `SELECT 1 FROM c_clave_unidad WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_USO_CFDI: `SELECT 1 FROM c_uso_cfdi WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_FORMA_PAGO: `SELECT 1 FROM c_forma_pago WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_REGIMEN_FISCAL: `SELECT 1 FROM c_regimen_fiscal WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_METODO_PAGO: `SELECT 1 FROM c_metodo_pago WHERE clave = $1 AND activo = true LIMIT 1`,
  VALIDATE_TIPO_RELACION: `SELECT 1 FROM c_tipo_relacion WHERE clave = $1 AND activo = true LIMIT 1`,

  // --- Bulk Validations ---
  VALIDATE_MANY_CLAVE_PROD_SERV: `
    SELECT clave FROM c_clave_prod_serv WHERE clave = ANY($1::varchar[]) AND activo = true
  `,

  // --- Upserts ---
  UPSERT_CLAVE_PROD_SERV: `
    INSERT INTO c_clave_prod_serv (clave, descripcion) 
    VALUES ($1, $2)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true
  `,
  UPSERT_CLAVE_UNIDAD: `
    INSERT INTO c_clave_unidad (clave, nombre, descripcion, nota) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, nota = EXCLUDED.nota, activo = true
  `,
  UPSERT_USO_CFDI: `
    INSERT INTO c_uso_cfdi (clave, descripcion, aplica_fisica, aplica_moral) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, aplica_fisica = EXCLUDED.aplica_fisica, aplica_moral = EXCLUDED.aplica_moral, activo = true
  `,
  UPSERT_FORMA_PAGO: `
    INSERT INTO c_forma_pago (clave, descripcion) 
    VALUES ($1, $2)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true
  `,
  UPSERT_REGIMEN_FISCAL: `
    INSERT INTO c_regimen_fiscal (clave, descripcion, aplica_fisica, aplica_moral) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, aplica_fisica = EXCLUDED.aplica_fisica, aplica_moral = EXCLUDED.aplica_moral, activo = true
  `,
  UPSERT_METODO_PAGO: `
    INSERT INTO c_metodo_pago (clave, descripcion) 
    VALUES ($1, $2)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true
  `,
  UPSERT_TIPO_RELACION: `
    INSERT INTO c_tipo_relacion (clave, descripcion) 
    VALUES ($1, $2)
    ON CONFLICT (clave) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true
  `,
} as const;
