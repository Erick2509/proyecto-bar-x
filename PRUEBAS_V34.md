# Pruebas rápidas v34

1. Abrir **Gastos** y cambiar Desde/Hasta. El total superior debe cambiar y no quedar en “Actualizando…”.
2. Escribir en Buscar concepto. El resultado y el total deben responder sin errores de consola.
3. Cambiar categoría y origen. El total debe corresponder solo a las filas filtradas.
4. Abrir **Historial de ventas**, cambiar Desde/Hasta y comprobar que el total excluye anuladas.
5. Elegir Efectivo/Yape/Plin/Tarjeta. En ventas con pago separado se suma únicamente la parte correspondiente a ese método.
6. Buscar una venta por producto o empleado y comprobar que el total cambia junto con los resultados.
7. Abrir una caja antes de medianoche, dejarla abierta y continuar con ventas después de las 00:00; debe seguir siendo la misma caja hasta pulsar Cerrar caja.
8. Revisar la consola: no debe aparecer `App.makeTablesMobileFriendly is not a function`.
