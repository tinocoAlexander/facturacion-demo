BEGIN;

-- ENUM de estados
DO $$ BEGIN
    CREATE TYPE ticket_estado AS ENUM ('pendiente', 'facturado', 'en_global', 'anulado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tabla tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  folio_externo VARCHAR(100) NOT NULL,
  fecha_venta TIMESTAMPTZ NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  total_iva NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_iva >= 0),
  total NUMERIC(14,2) NOT NULL CHECK (total > 0),
  forma_pago VARCHAR(2) NOT NULL,
  moneda CHAR(3) NOT NULL DEFAULT 'MXN',
  tipo_cambio NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  estado ticket_estado NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(empresa_id, folio_externo)
);

-- Tabla ticket_items
CREATE TABLE IF NOT EXISTS ticket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  descripcion VARCHAR(500) NOT NULL,
  cantidad NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,6) NOT NULL CHECK (precio_unitario >= 0),
  descuento NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
  subtotal NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
  tasa_iva NUMERIC(5,4) NOT NULL CHECK (tasa_iva >= 0),
  importe_iva NUMERIC(14,2) NOT NULL DEFAULT 0,
  clave_prod_serv VARCHAR(8) NOT NULL,
  clave_unidad VARCHAR(3) NOT NULL,
  objeto_imp VARCHAR(2) NOT NULL DEFAULT '02',
  posicion SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_estado ON tickets(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_tickets_empresa_fecha ON tickets(empresa_id, fecha_venta DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_pendientes ON tickets(empresa_id, fecha_venta) WHERE estado = 'pendiente';
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_folio_externo ON tickets(empresa_id, folio_externo);
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket ON ticket_items(ticket_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_tickets_updated_at ON tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMIT;
