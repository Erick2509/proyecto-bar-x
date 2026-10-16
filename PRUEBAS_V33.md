# PRUEBAS v33

## A. Historial de ventas
1. Entra a **Ventas / Historial**.
2. Cambia Desde y Hasta a un solo día.
3. Verifica que **Total vendido en este filtro** cambie y coincida con las ventas completadas de ese día.
4. Amplía el rango y confirma que el total aumente/disminuya según los resultados.
5. Filtra por Efectivo, Yape, Plin y Tarjeta.
6. En una venta con pago separado, confirma que al filtrar por un método se sume solo la parte de ese método.
7. Las ventas anuladas deben aparecer como anuladas, pero no deben sumar al total.

## B. Gastos
1. Entra a **Gastos**.
2. Cambia el rango Desde/Hasta.
3. Verifica que el total de gastos cambie inmediatamente.
4. Prueba búsqueda, categoría y origen; el total y la cantidad deben coincidir con lo filtrado.

## C. Caja nocturna
Prueba idealmente cerca del cambio de día o simulando ventas con una caja abierta en un día anterior en un entorno de prueba.
1. Abre caja y registra ventas.
2. Mantén la caja abierta al cambiar de fecha.
3. Confirma que el sistema siga mostrando **Caja abierta** y permita vender.
4. Registra una venta después de medianoche.
5. En Caja, verifica que **Total vendido en esta caja** incluya ventas de ambos días.
6. Cierra caja y confirma que efectivo esperado = monto inicial + efectivo vendido durante toda la sesión.
7. Revisa Historial de caja: debe mostrar la fecha/hora de apertura y de cierre.

## D. Regresión
- Pago normal.
- Pago separado.
- Anulación de venta.
- Inventario y descuento de stock.
- CRUD de gastos.
- Dashboard de hoy después de cambiar de fecha.
