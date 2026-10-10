# Pruebas v30

## Validaciones automáticas realizadas
- Sintaxis de todos los archivos JavaScript con `node --check`.
- Prueba simulada del reinicio total de Firestore.
- Verificación de contraseña incorrecta y contraseña válida.
- Verificación de eliminación de cajas, ventas, gastos, movimientos, productos, categorías, archivos técnicos y auditoría.
- Verificación de eliminación de perfiles de empleados conservando al administrador conectado.
- Prueba del tutorial progresivo: Categorías → Productos → Inventario → Caja → Ventas.
- Verificación de apartados bloqueados/desbloqueados según requisitos.
- Verificación de omisión de la venta de prueba y finalización del tutorial.
- Service Worker actualizado a `proyecto-x-v30`.

## Nota sobre Authentication
Firebase Authentication no permite que una PWA cliente elimine de forma segura las cuentas de otros usuarios. El reinicio elimina sus perfiles de Firestore. Si se van a reutilizar los mismos correos, las cuentas antiguas deben borrarse una vez desde Firebase Console → Authentication → Users.
