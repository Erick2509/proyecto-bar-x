# Proyecto X Bar v32 — Cambios principales

Esta versión parte de la v31 corregida y agrega los cambios solicitados para ventas, inventario, gastos, movimientos, caja y dashboard.

## Cambios implementados

1. Se eliminó **Ticket promedio** de los dashboards.
2. El **precio de compra maestro** del producto se conserva al agregar stock. El costo de una nueva compra sirve para calcular el gasto de esa entrada, pero ya no reemplaza automáticamente el precio de compra guardado en Inventario.
3. El selector de íconos fue ampliado a más de 300 emojis y mantiene un campo libre que permite pegar/escribir cualquier emoji compatible con el dispositivo.
4. **Gastos** ahora tiene CRUD para gastos manuales: crear, consultar, editar y eliminar. Los gastos automáticos generados por compras de inventario quedan protegidos como solo lectura para no romper la trazabilidad.
5. Se agregaron filtros a **Gastos** y **Movimientos**, incluyendo rango Desde/Hasta.
6. El módulo visible **Productos** pasó a llamarse **Inventario**. Se conservan los nombres internos de rutas/colecciones para no romper Firebase ni el código existente.
7. Se agregó **Pago por separado**: una venta puede cobrarse en dos partes usando dos métodos distintos entre Efectivo, Yape, Plin y Tarjeta. La suma debe coincidir exactamente con el total.
8. **Historial de ventas** tiene rango Desde/Hasta. El total y la cantidad de ventas válidas cambian según rango, método y búsqueda.
9. **Gastos** tiene rango Desde/Hasta y una tarjeta **Total según filtros**, que cambia con fecha, categoría, origen y búsqueda.
10. En **Caja**, el monto inicial queda separado de las ventas. El cierre muestra Monto inicial + Ventas en efectivo = Efectivo esperado, mientras que Total vendido nunca incluye la apertura.
11. El **Dashboard** muestra tarjetas de Ventas totales de hoy, Total efectivo, Yape/Plin y Tarjeta.

## Pago por separado

La venta sigue siendo **una sola venta**:
- el stock se descuenta una sola vez;
- se guarda `metodoPago: "Pago separado"`;
- se guarda el detalle en `pagos`, por ejemplo:
  - Efectivo: S/ 20.00
  - Yape: S/ 30.00
- Caja, Dashboard, Historial, Reportes y anulaciones distribuyen correctamente cada parte.

## Importante

Antes de utilizar v32 en producción, publica el archivo `firestore.rules` incluido en esta versión. Las reglas v32 permiten el nuevo campo `pagos` de las ventas y validan pagos simples y divididos.

El Service Worker fue actualizado a `proyecto-x-v32`.
