# UUID para IDs de empresas

## Contexto
Los usuarios tienen id SERIAL (integer). Las empresas usan UUID.

## Decisión
Las entidades de negocio (empresas, tickets, CSDs, CFDIs) usan UUID para:
- Evitar enumeración de IDs por parte de atacantes
- Compatibilidad con sistemas distribuidos y sharding futuro
- El FK empresa_id en users es UUID aunque users.id sea integer

## Consecuencias
Los endpoints que reciben empresa IDs usan @ParseUUIDPipe para validación automática.
