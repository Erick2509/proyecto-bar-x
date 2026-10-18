# ProyectoBarX v35 — Jornadas nocturnas

## Objetivo
La operación del bar deja de depender del día calendario. Una jornada puede abrir el 16/10 por la noche y cerrarse el 17/10 de madrugada sin cortar ventas ni obligar a abrir otra caja.

## Cambios implementados

### 1. Jornada operativa
- Nueva colección `jornadas`.
- Código automático visible `JOR-XXXXXX`.
- Apertura con responsable, fecha/hora real y monto inicial.
- Estado `Abierta` / `Cerrada`.
- La jornada permanece abierta hasta que el usuario pulse **Finalizar jornada**.
- No existe cierre automático al cambiar de fecha.

### 2. Caja vinculada a la jornada
- La caja principal y la jornada usan el mismo identificador para mantener compatibilidad con la arquitectura existente.
- El monto inicial es fondo de apertura, no venta.
- Al cierre se guarda fecha/hora, duración, ventas, gastos, medios de pago, efectivo esperado, efectivo contado y diferencia.

### 3. Control de efectivo
Se incorporó la fórmula:

`Monto inicial + Ventas en efectivo + Ingresos de efectivo - Retiros de efectivo - Gastos pagados en efectivo = Efectivo esperado`

Nuevas acciones:
- **Ingreso de efectivo**: por ejemplo sencillo adicional. No suma como venta.
- **Retiro de efectivo**: por ejemplo retiro para resguardo. No resta ventas.

### 4. Gastos por medio de pago
Los gastos manuales ahora permiten elegir:
- Efectivo
- Yape
- Plin
- Tarjeta
- Otro

Un gasto en efectivo vinculado a una jornada reduce el efectivo esperado de esa jornada. Editar o eliminar un gasto manual de una jornada cerrada reajusta su resumen de cierre.

### 5. Registros vinculados
Los nuevos registros operativos almacenan `jornadaId` cuando existe una jornada abierta:
- Ventas
- Gastos
- Movimientos de inventario
- Movimientos de efectivo

La fecha y hora real de cada operación se conservan independientemente de la jornada.

### 6. Dashboard
Cuando existe jornada abierta muestra como información principal:
- Ventas de la jornada
- Efectivo
- Yape / Plin
- Tarjeta
- Gastos de la jornada
- Monto inicial y estado de jornada

### 7. Historial de jornadas
Nueva pantalla **Jornadas** con:
- código
- apertura
- cierre
- responsable
- duración
- ventas
- gastos
- estado
- detalle del efectivo esperado/contado y diferencia

### 8. Filtros
Se agregó filtro por Jornada a:
- Historial de ventas
- Gastos
- Movimientos de inventario

La selección de una jornada ajusta automáticamente Desde/Hasta a sus fechas reales.

### 9. Jornadas prolongadas
Si una jornada cruza medianoche o supera 14 horas:
- se informa al usuario;
- se permite continuar trabajando;
- nunca se cierra de forma automática.

Al iniciar sesión con una jornada prolongada abierta aparece un recordatorio para **Continuar jornada** o **Revisar / finalizar**.

### 10. Compatibilidad con v34
- Una caja antigua que todavía esté abierta se intenta vincular automáticamente a una jornada del mismo ID.
- Las cajas cerradas antiguas se muestran como jornadas de historial legado sin reescribir sus datos históricos.

### 11. PWA y seguridad
- Caché actualizado a `proyecto-x-v35`.
- `firestore.rules` incluye `jornadas` y `cashMovements`, además de validaciones de `jornadaId` en ventas y movimientos.
- El cierre y la apertura se ejecutan mediante transacciones de Firestore para evitar estados incompletos.

## Nota de arquitectura
v35 conserva la arquitectura actual del proyecto: cada caja/jornada pertenece al usuario responsable que la abre. No se convirtió el proyecto a otro framework ni se añadieron microservicios.
