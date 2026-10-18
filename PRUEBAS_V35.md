# Pruebas v35 — Jornada + Caja

## Pruebas automáticas/locales realizadas
Se ejecutaron validaciones de sintaxis de todos los archivos JavaScript y pruebas funcionales simuladas sobre la lógica de jornada.

Resultado de la última ejecución local:
- **25 comprobaciones funcionales completadas correctamente**.
- Todos los `.js` pasan `node --check`.
- `firestore.rules` tiene delimitadores balanceados en la revisión estática.

Casos cubiertos en la simulación:
1. Jornada 20:00 → 05:30 calcula 570 minutos.
2. Código visible de jornada.
3. Total de ventas de jornada.
4. Pago dividido por Efectivo/Yape.
5. Plin y Tarjeta.
6. Ventas anuladas no suman.
7. Gastos de jornada.
8. Gastos pagados en efectivo.
9. Ingresos de efectivo.
10. Retiros de efectivo.
11. Cálculo de efectivo esperado.
12. Render de Caja con mensaje de continuidad a medianoche.
13. Botones de ingreso/retiro.
14. Render de historial de Jornadas.
15. Filtro de Historial por jornada.
16. Filtro por método en pago dividido suma solo la parte correspondiente.
17. Filtro de Gastos por jornada y total dinámico.

## Pruebas que debes hacer con tu Firebase real
Estas pruebas requieren tus usuarios, tu proyecto Firebase y las reglas ya publicadas:

### A. Apertura
- Abrir jornada con S/ 100.
- Verificar que aparezca `JOR-XXXXXX`.
- Verificar que el monto inicial no figure como venta.

### B. Ventas antes y después de medianoche
- Registrar ventas durante la jornada.
- Si es posible, mantenerla abierta al cambiar el día o usar una jornada de prueba durante la madrugada.
- Confirmar que no se cierre automáticamente.
- Confirmar que ambas fechas pertenezcan a la misma jornada.

### C. Pago separado
- Hacer una venta, por ejemplo S/ 50: S/ 20 Efectivo + S/ 30 Yape.
- Confirmar una sola venta y un solo descuento de stock.
- Filtrar Historial por Efectivo: debe sumar S/ 20 de esa venta.
- Filtrar por Yape: debe sumar S/ 30.

### D. Gastos
- Registrar gasto de S/ 10 pagado en Efectivo.
- Confirmar que Gastos lo muestre dentro de la jornada.
- Confirmar que el efectivo esperado baje S/ 10.
- Editar y luego eliminar un gasto manual; verificar que los totales se reajusten.

### E. Ingreso y retiro
- Registrar ingreso S/ 50.
- Registrar retiro S/ 20.
- Confirmar que no aparezcan como ventas.
- Confirmar que el esperado suba S/ 50 y baje S/ 20.

### F. Cierre
Con monto inicial S/ 100, efectivo vendido S/ 70, ingreso S/ 50, retiro S/ 20 y gasto efectivo S/ 10, el esperado debe ser **S/ 190**.
- Ingresar efectivo contado S/ 188.
- La diferencia debe ser **-S/ 2**.
- Cerrar jornada y verificar su historial.

### G. Jornada prolongada
- Una jornada que cruza de fecha debe mostrar aviso, no cerrarse.
- Una jornada con duración >= 14 h debe mostrar advertencia, pero permitir seguir trabajando.

### H. Filtros
- Historial de ventas → seleccionar Jornada y comprobar total.
- Gastos → seleccionar Jornada y comprobar total.
- Movimientos → seleccionar Jornada y comprobar registros.

## Nota sobre reglas Firestore
No se ejecutó un emulador de Firebase contra el proyecto real dentro de este entorno porque no se dispone de tus credenciales ni de `firebase-tools`. Se realizó revisión estática de las reglas y de las transacciones del cliente. La validación final de permisos debe hacerse publicando `firestore.rules` v35 en un entorno de prueba de tu Firebase antes de producción.
