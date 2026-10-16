# ProyectoBarX v34 — corrección de filtros

## Correcciones principales

- Corregido el error `App.makeTablesMobileFriendly is not a function`.
- El total de **Gastos** se recalcula antes de redibujar la tabla y ya no queda en “Actualizando…”.
- El total del **Historial de ventas** se recalcula antes de redibujar la tabla.
- Los filtros por texto usan un debounce corto (90 ms) para responder rápido sin reconstruir la tabla en cada pulsación.
- Al cambiar un rango de fechas, la interfaz muestra de inmediato los datos ya disponibles y luego sincroniza el rango con Firestore.
- Si una utilidad visual de tabla o paginación falla, no bloquea los totales ni el filtro.
- En Historial, “Resultados” muestra el número total de registros visibles y debajo separa completadas/anuladas.
- Caché PWA actualizado a `proyecto-x-v34`.

## Caja

Se conserva el comportamiento de v33: una caja abierta **no se cierra a medianoche**. Continúa abierta hasta que el usuario la cierre manualmente, incluso si la atención termina de madrugada al día siguiente.
