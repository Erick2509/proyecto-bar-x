# Pruebas recomendadas — Proyecto X Bar v32

Realiza estas pruebas después de publicar `firestore.rules`.

## 1. Dashboard
- Abrir caja.
- Registrar una venta en Efectivo, una en Yape/Plin y una en Tarjeta.
- Confirmar que las tarjetas del Dashboard cambian por método.
- Confirmar que no aparece Ticket promedio.
- Confirmar que el monto inicial de caja no se suma a Ventas totales ni Total efectivo.

## 2. Inventario y precio de compra
- Crear un producto con Precio de compra S/ 3.00.
- Agregar stock indicando costo de esa compra S/ 4.00.
- Verificar que el gasto use S/ 4.00 por unidad.
- Volver a editar el producto y confirmar que su Precio de compra maestro continúa en S/ 3.00.

## 3. Emojis
- Abrir Agregar/Editar producto.
- Probar varios grupos del selector.
- Pegar manualmente un emoji que no aparezca en la lista.
- Guardar y confirmar que se muestra correctamente.

## 4. CRUD Gastos
- Crear un gasto manual.
- Editarlo.
- Filtrarlo.
- Eliminarlo.
- Confirmar que un gasto automático de Inventario aparece como bloqueado/solo lectura.

## 5. Filtros Gastos
- Cambiar Desde y Hasta.
- Filtrar por categoría.
- Filtrar por origen.
- Buscar por concepto.
- Confirmar que `Total según filtros` y la cantidad de registros cambian correctamente.

## 6. Filtros Movimientos
- Filtrar por producto.
- Filtrar por tipo.
- Cambiar el rango Desde/Hasta.
- Confirmar que solo aparecen movimientos del rango.

## 7. Pago simple
- Vender normalmente con Efectivo/Yape/Plin/Tarjeta.
- Confirmar que se registra una sola venta y se descuenta el stock correcto.

## 8. Pago por separado
Ejemplo con venta total S/ 50.00:
- Activar `Pago por separado`.
- Primera parte: Efectivo S/ 20.00.
- Segunda parte: Yape S/ 30.00.
- Confirmar.
- Verificar en Historial que aparece `Efectivo S/20.00 + Yape S/30.00`.
- Verificar Dashboard/Caja: S/ 20.00 a Efectivo y S/ 30.00 a Yape.
- Probar dos métodos iguales: debe rechazarse.
- Probar una primera parte igual o mayor al total: debe rechazarse.

## 9. Historial de ventas
- Elegir un rango de fechas.
- Confirmar que Total de ventas filtradas cambia con el rango.
- Filtrar por un método incluido dentro de una venta dividida.
- Confirmar que la venta dividida aparece.
- Anular una venta dividida como administrador y comprobar que devuelve el stock y corrige los medios de pago de una caja cerrada.

## 10. Caja
Con apertura S/ 100.00 y ventas en efectivo S/ 40.00:
- `Monto inicial`: S/ 100.00.
- `Ventas en efectivo`: S/ 40.00.
- `Total vendido`: solo ventas.
- `Efectivo esperado`: S/ 140.00.
- Cerrar con S/ 140.00 y confirmar diferencia S/ 0.00.
- Revisar Historial de caja y confirmar que Monto inicial aparece en su propia columna.

## Validaciones técnicas realizadas
- `node --check` en los JavaScript principales.
- Prueba aislada de pagos divididos y compatibilidad con ventas antiguas.
- Prueba de rechazo cuando las dos partes no suman el total.
- Prueba de stock: una venta dividida descuenta una sola vez.
- Prueba de ingreso de stock: no sobrescribe Precio de compra maestro.
- Prueba de editar/eliminar gastos manuales.
- Renderizado estático de Dashboard, Gastos, Movimientos, Historial, Caja y Ventas.
