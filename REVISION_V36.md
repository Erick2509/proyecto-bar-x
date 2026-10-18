# PROYECTOBARX — Revisión v36 (candidato de pruebas)

## Alcance realizado
- Conserva HTML/CSS/JavaScript y el SDK Firebase existente.
- El administrador puede crear gastos manuales y consultar, editar o eliminar tanto manuales como automáticos. La generación de gastos automáticos sigue ligada a entradas de inventario; no se permite falsificar su origen manualmente.
- En edición, una transacción guarda el estado previo y el cambio en `expenseRevisions`. En eliminación, una transacción archiva el gasto completo en `deletedExpenses` y lo quita de `expenses`; no se borra el movimiento de inventario original.
- La edición conserva `origen`, autor, fecha, hora, `jornadaId` y el vínculo con inventario. No modifica unidades físicas de inventario.
- Si la jornada estaba cerrada, las ediciones y eliminaciones reajustan sus resúmenes y la diferencia de caja como hacía v35.
- Cierre de caja: si falla recargar gastos, ventas o movimientos de efectivo, la operación se bloquea (antes continuaba con datos parciales).
- Refresco de consultas de jornada: se eliminan de memoria entradas antiguas de la misma jornada antes de fusionar la instantánea reciente, evitando incluir gastos previamente borrados. Igual para movimientos de caja y ventas de caja.
- PWA: nombre de caché incrementado, para evitar reutilizar JS v35.
- Reset administrativo incluye ahora las dos colecciones archivadas nuevas.

## IMPORTANTE: pendientes antes de producción
1. **No es un sistema transaccional de contabilidad completo**: el cierre agrega documentos en el navegador; operaciones concurrentes entre lectura y transacción pueden desfasar importes. Bloquear la jornada y coordinar todos los escritores requiere rediseñar los flujos de escrituras, o una operación confiable en servidor.
2. **No se ha ejecutado Firebase Emulator ni E2E con usuarios reales**. Validar permisos Firestore de empleados en lectura de gastos vinculados a su jornada, y reglas de creación de archivos, antes de desplegar.
3. **El plan gratuito NO está garantizado**: cuotas de lecturas/escrituras, almacenamiento y ancho de banda dependen del uso. El historial sigue creciendo. Hace falta medir uso real en consola, establecer retención/exportación y probar índices de consultas.
4. **No actualizar reglas directamente en producción sin backup y despliegue de prueba**. Crear índice(s) si la consola muestra `FAILED_PRECONDITION`.
5. La eliminación de gasto automático **no revierte la entrada de inventario**: afecta gasto contable solamente. Se preserva la procedencia para auditoría. Para revertir stock debe utilizarse una operación de inventario separada.
6. El código visible `JOR-XXXXXX` es abreviado y no se garantiza único; usar el ID completo de documento para referencias internas.

## Comprobaciones locales
Ejecutar `node --check` en cada archivo JS. El ZIP se valida con zipfile.testzip. Estas pruebas no sustituyen pruebas de integración.
