-- Migración para soportar versionado de llaves de cifrado en CSDs
ALTER TABLE csds ADD COLUMN key_version SMALLINT NOT NULL DEFAULT 1;

COMMENT ON COLUMN csds.key_version IS 'Versión de la llave CSD_ENCRYPTION_KEY usada para cifrar este registro';
