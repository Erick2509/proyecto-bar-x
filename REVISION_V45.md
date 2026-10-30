# ProyectoBarX v45 - Reporte Excel de cinco hojas

## Cambios
- Resumen con seis indicadores, saldo operativo, control de conciliación, periodo y notas.
- Detalle de Ventas, Gastos, Métodos de pago y Productos vendidos agregado.
- Las ventas se cuentan una sola vez; los productos se agregan a partir de los renglones originales de cada venta.
- Pago dividido desglosado por método; exporta solo el rango aplicado en Reportes.
- Estilos de celdas usando xlsx-js-style (dependencia CDN).

## Limitaciones y pendientes
- El Excel de navegador no incluye gráfico incrustado; se priorizó integridad de valores y estilo.
- Requiere cargar el CDN de xlsx-js-style; en modo offline no se podrá generar hasta cachear esta librería.
- Los datos de productos provienen de las líneas de venta; pueden faltar categoría o nombre en ventas históricas.
- No se han ejecutado pruebas E2E con Firebase; candidato, no certificado para producción.
