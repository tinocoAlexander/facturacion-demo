#!/bin/sh
set -e

# Wait for PostgreSQL to be available
wait_for_db() {
  echo "Esperando a que PostgreSQL esté disponible en ${DB_HOST}:${DB_PORT}..."
  
  MAX_TRIES=30
  COUNT=0
  
  # Usamos pg_isready (proporcionado por el paquete postgresql-client en Alpine)
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
      echo "Error: PostgreSQL no estuvo disponible después de $MAX_TRIES intentos. Abortando."
      exit 1
    fi
    echo "Intento $COUNT/$MAX_TRIES: DB no disponible, reintentando en 2s..."
    sleep 2
  done
  
  echo "PostgreSQL está listo."
}

# Lógica de migraciones
if [ "$RUN_MIGRATIONS" = "true" ]; then
  wait_for_db
  echo "Iniciando ejecución de migraciones..."
  # Ejecutamos el script de migraciones compilado
  if node dist/database/migrate.js; then
    echo "Migraciones completadas exitosamente."
  else
    echo "ERROR: Las migraciones fallaron. Abortando el arranque de la aplicación."
    exit 1
  fi
fi

# Iniciar la aplicación
echo "Arrancando aplicación con: node dist/main"
exec node dist/main
