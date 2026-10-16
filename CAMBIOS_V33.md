# CAMBIOS v33

## 1. Totales dinámicos en filtros

### Historial de ventas
- La tarjeta **Total vendido en este filtro** se recalcula cada vez que cambia:
  - Desde / Hasta
  - Método de pago
  - Búsqueda
- Las ventas anuladas se muestran en la tabla pero **no suman** al total.
- Si se filtra por Efectivo, Yape, Plin o Tarjeta y existe un pago separado, se suma únicamente el monto pagado con ese método.
- Se muestra el rango activo y la cantidad de ventas completadas/anuladas.

### Gastos
- La tarjeta **Total de gastos en este filtro** cambia automáticamente con fecha, categoría, origen y búsqueda.
- La cantidad de resultados también se actualiza.
- Si falla la carga del rango, se informa el error en lugar de mostrar un total potencialmente incompleto.

## 2. Caja continua / turno nocturno
- La caja ya **no depende de la fecha de apertura**.
- Puede abrirse, por ejemplo, el 16/10 a las 20:00 y cerrarse el 17/10 a las 05:00.
- Las ventas conservan su fecha y hora reales, pero permanecen asociadas a la misma caja mediante `cajaId`.
- El cierre suma todas las ventas de esa sesión, incluso si son de días distintos.
- La pantalla muestra claramente desde cuándo está abierta la caja y explica que no se cierra a medianoche.
- El sistema actualiza automáticamente los indicadores "de hoy" cuando cambia el día.

## 3. Reglas Firestore
- Se retiró la condición que obligaba a que `cashSessions.fecha` fuera igual a `sales.fecha`.
- Sigue siendo obligatorio que la caja esté abierta y pertenezca al usuario que registra la venta.

## Importante
Publica el archivo `firestore.rules` de esta versión antes de probar ventas después de medianoche.

## 4. Ajustes de experiencia de uso
- Se eliminó la palabra técnica **CRUD** de la pantalla de Gastos.
- Ventas y Gastos muestran una indicación clara de que el total se actualiza automáticamente.
- Se agregó **Limpiar filtros** para volver rápidamente al rango predeterminado.
- Los gastos automáticos de inventario se muestran con un estado bloqueado más legible.
