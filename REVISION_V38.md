# ProyectoBarX v38 — candidata de integridad y eficiencia

Base: v37. NO instalar directamente en producción.

## Cambios realmente aplicados
1. `fetchInto`: solicitudes simultáneas con la misma clave se comparten mediante `pendingFetches` para evitar descargas duplicadas en la misma sesión. La promesa se elimina incluso ante error.
2. `fetchInto`: añade `serverOnly`; el cierre fuerza consultas `get({source:'server'})` para ventas, gastos y movimientos de efectivo, sin aceptar caché local offline como fuente de verdad.
3. `closeCash`: mantiene el bloqueo ante cualquier error de lectura; comprueba en la transacción que existe el bloqueo `cashLocks`, que apunta a esa misma caja y permanece abierto antes de cerrar.
4. `loadSalesForRange` del empleado: propaga fallos de cualquier fecha en lugar de informar éxito con datos incompletos.
5. Se valida un límite razonable del importe de efectivo declarado, y la PWA pasa a `proyecto-x-v38`.
6. Mantiene el CRUD administrativo de gastos (incluidos automáticos) y sus archivos de revisiones; no inventa una restauración de inventario al anular el gasto.

## Límites importantes no resueltos
- **Carrera crítica**: el cierre sigue calculando agregados de varios documentos antes de su transacción. Una venta o gasto nuevo entre lectura y cierre puede quedar fuera del total. Se requiere serialización de todas las escrituras por caja contra un documento versionado o backend confiable. No está aprobado para producción.
- `journeyNumber` es un alias abreviado y no se garantiza único.
- Históricos/reportes siguen consultando rangos potencialmente grandes sin paginación real; la deduplicación solo reduce consultas idénticas simultáneas, no el total de documentos devueltos.
- La persistencia de copias de seguridad, reglas y transacciones multidispositivo necesitan validación con Firebase Emulator.
- Estas modificaciones reducen algunas lecturas repetidas, pero **no constituyen una optimización integral de la BD** ni garantizan el plan gratuito por años.

## Pruebas incluidas
`node tests/v38-static.cjs` verifica invariantes textuales y sintaxis. No sustituye pruebas E2E con Firestore Emulator y usuarios reales.
