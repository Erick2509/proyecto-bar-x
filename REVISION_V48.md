# ProyectoBarX v48 — Visibilidad de descuentos

- Historial de ventas: subtotal, descuento, total cobrado y resumen de descuentos filtrados.
- Confirmaciones de pago, incluido pago dividido: subtotal, descuento y neto.
- Caja/jornadas: descuento acumulado separado del total neto, sin tratarlo como gasto.
- Tablas de jornadas y detalle: descuentos separados, conservando los importes de caja basados en cobros netos.
- Compatibilidad con ventas antiguas sin campos de descuento (descuento cero).

**Advertencia:** descuentos de jornadas antiguas pueden mostrarse incompletos si las ventas correspondientes no están cargadas en la memoria por paginación/rango. Los totales netos cerrados siguen usando los resúmenes persistidos. Se requiere validación con Firebase antes de producción.
