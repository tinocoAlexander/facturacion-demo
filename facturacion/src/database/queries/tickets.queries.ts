export const TICKET_QUERIES = {
  FIND_BY_ID_AND_EMPRESA: `
    SELECT t.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', ti.id,
            'descripcion', ti.descripcion,
            'cantidad', ti.cantidad,
            'precio_unitario', ti.precio_unitario,
            'descuento', ti.descuento,
            'subtotal', ti.subtotal,
            'tasa_iva', ti.tasa_iva,
            'importe_iva', ti.importe_iva,
            'clave_prod_serv', ti.clave_prod_serv,
            'clave_unidad', ti.clave_unidad,
            'objeto_imp', ti.objeto_imp,
            'posicion', ti.posicion
          ) ORDER BY ti.posicion
        ) FILTER (WHERE ti.id IS NOT NULL), '[]'
      ) as items
    FROM tickets t
    LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
    WHERE t.id = $1 AND t.empresa_id = $2
    GROUP BY t.id
  `,
  FIND_BY_FOLIO_EXTERNO_AND_EMPRESA: `
    SELECT id, estado FROM tickets
    WHERE folio_externo = $1 AND empresa_id = $2
  `,
  CHECK_TICKET_FACTURABLE: `
    SELECT id, estado, total, forma_pago FROM tickets
    WHERE id = $1 AND empresa_id = $2 AND estado = 'pendiente'
    FOR UPDATE
  `,
  GET_PENDING_FOR_GLOBAL: `
    SELECT t.id, t.subtotal, t.total_iva, t.total, t.forma_pago,
           json_agg(ti.* ORDER BY ti.posicion) as items
    FROM tickets t
    JOIN ticket_items ti ON ti.ticket_id = t.id
    WHERE t.empresa_id = $1
      AND t.estado = 'pendiente'
      AND t.fecha_venta::date = $2::date
    GROUP BY t.id
    FOR UPDATE SKIP LOCKED
  `,
  UPDATE_ESTADO: `
    UPDATE tickets SET estado = $1, updated_at = NOW()
    WHERE id = $2 AND empresa_id = $3
    RETURNING id, estado, updated_at
  `,
  UPDATE_MANY_ESTADO: `
    UPDATE tickets SET estado = $1, updated_at = NOW()
    WHERE id = ANY($2) AND empresa_id = $3
  `,
  STATS_BY_EMPRESA: `
    SELECT
      COUNT(*) FILTER (WHERE estado = 'pendiente')  as pendientes,
      COUNT(*) FILTER (WHERE estado = 'facturado')  as facturados,
      COUNT(*) FILTER (WHERE estado = 'en_global')  as en_global,
      COUNT(*) FILTER (WHERE estado = 'anulado')    as anulados,
      COALESCE(SUM(total) FILTER (
        WHERE estado != 'anulado'
      ), 0) as monto_total,
      COALESCE(SUM(total) FILTER (
        WHERE fecha_venta >= date_trunc('day', NOW())
          AND estado != 'anulado'
      ), 0) as monto_hoy
    FROM tickets
    WHERE empresa_id = $1
  `,
  
  // Nueva: reemplaza el SQL dinámico inline
  // Nota: la query dinámica con filtros opcionales se maneja con un helper,
  // no con concatenación de strings — ver instrucciones abajo
  FIND_ALL_BASE: `
    SELECT id, empresa_id, folio_externo, fecha_venta, subtotal, total_iva,
           total, forma_pago, moneda, tipo_cambio, estado, notas, metadata,
           created_at, updated_at
    FROM tickets
    WHERE empresa_id = $1
  `,
  
  // Nueva: insert de ticket
  INSERT_TICKET: `
    INSERT INTO tickets (
      empresa_id, folio_externo, fecha_venta, subtotal, total_iva, total,
      forma_pago, moneda, tipo_cambio, estado, notas, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `,
  
  // Nueva: insert de items (usa unnest para batch eficiente)
  INSERT_TICKET_ITEMS: `
    INSERT INTO ticket_items (
      ticket_id, descripcion, cantidad, precio_unitario, descuento, subtotal,
      tasa_iva, importe_iva, clave_prod_serv, clave_unidad, objeto_imp, posicion
    )
    SELECT $1, * FROM unnest(
      $2::text[], $3::numeric[], $4::numeric[], $5::numeric[], $6::numeric[],
      $7::numeric[], $8::numeric[], $9::text[], $10::text[], $11::text[], $12::smallint[]
    )
  `
} as const;
