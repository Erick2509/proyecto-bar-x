# V44 – Exportación de Reportes a Excel (candidato)

- Botón Descargar Excel junto al filtro de fechas, disponible solo tras aplicar y cargar correctamente el rango.
- Exporta cuatro hojas: Resumen, Ventas, Gastos, Pagos.
- Excluye ventas y gastos anulados según la misma lógica de las tarjetas.
- Pagos divididos: una fila por método.
- XLSX generado exclusivamente en el navegador desde los datos cargados, sin escrituras adicionales en Firestore.
- Se requieren conectividad para cargar la librería XLSX y permisos de administrador.
- CSV/Excel contiene datos personales de empleados: conservar de forma segura.
- LIMITACIÓN: sin pruebas funcionales integradas contra Firebase; no etiquetar como producción.
- Considerar descarga local de librería y pruebas de consistencia si se publicara.
