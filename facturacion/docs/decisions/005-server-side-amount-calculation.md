# ADR 005: Cálculo de Montos Server-Side

## Estado
Aceptado

## Contexto
En el flujo de ingesta de tickets, los clientes (terminales de punto de venta) envían el subtotal, IVA y total calculado localmente. En versiones anteriores, el servidor confiaba en estos valores. Esto permitía que un cliente malintencionado o con errores de redondeo enviara discrepancias (ej. subtotal $100 + IVA $16 = Total $110), lo cual generaría inconsistencias graves al emitir facturas CFDI legales.

## Decisión
El sistema ahora ignorará los campos de montos totales enviados por el cliente (`subtotal`, `total_iva`, `total`) y los recalculará de forma autoritativa en el servidor utilizando los datos de los ítems (`cantidad`, `precio_unitario`, `tasa_iva`).

- Se aplica redondeo a 2 decimales en cada paso intermedio siguiendo los estándares del SAT.
- Si hay una diferencia significativa entre lo enviado y lo calculado, el servidor simplemente sobreescribe con el valor correcto (Política de "Server knows best").

## Consecuencias
- **Integridad**: Se garantiza que el 100% de los tickets en la base de datos son matemáticamente consistentes.
- **Seguridad**: Se elimina el riesgo de fraude por manipulación de totales.
- **Simplicidad para el Cliente**: Las aplicaciones cliente no necesitan preocuparse por la precisión extrema de los totales, ya que el servidor es el validador final.
