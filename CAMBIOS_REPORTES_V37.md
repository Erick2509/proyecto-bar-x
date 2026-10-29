# Reportes v37 — candidato de pruebas

- Se retiran Costo vendido y Resultado estimado del apartado Reportes.
- Se muestran seis tarjetas: Ventas, Gastos, Efectivo, Yape, Plin y Tarjeta.
- Rango inclusivo desde/hasta, por fecha real de la venta y gasto; los pagos divididos se contabilizan por componente.
- El filtro usa consultas de rango Firestore existentes y caché TTL de 5 minutos. No descarga todos los años por defecto.
- Selección limitada a 366 días para evitar lecturas excesivas accidentales.
- Las tarjetas solo se refrescan tras completar ambas consultas; un fallo no muestra resultados parciales.
- Diseño responsive 3, 2, 2 o 1 columnas según ancho.

Pendiente: validación integrada contra proyecto Firebase de pruebas, datos masivos y presupuesto medido de lecturas. No publicar en producción sin esas pruebas.
