# Guía de inicio - Proyecto X Bar v32

## Reinicio seguro para una instalación limpia
1. Ingrese con la cuenta administradora.
2. Abra **Configuración**.
3. Pulse **Reiniciar y dejar sistema limpio**.
4. Ingrese la **contraseña actual de esa cuenta administradora**.
5. Firebase Authentication revalidará la identidad antes de permitir el borrado.
6. Confirme la eliminación.
7. El sistema conserva únicamente el perfil del administrador conectado y vuelve a activar el tutorial inicial.

> Ya no existe una contraseña fija de reinicio escrita en el JavaScript.

> Importante: una PWA web no puede eliminar de forma administrativa las cuentas de otros usuarios de Firebase Authentication. El reinicio elimina sus perfiles de Firestore. Si desea reutilizar los mismos correos, elimine las cuentas antiguas desde Firebase Console > Authentication > Users.

## Tutorial integrado
El tutorial habilita las secciones en este orden:
1. Categorías.
2. Inventario: registrar los productos.
3. Inventario: movimientos y control de stock.
4. Empleados (opcional).
5. Caja.
6. Venta de prueba (se puede omitir).
7. Al finalizar, se habilitan todos los apartados.

## Datos que elimina el reinicio
Ventas, cajas, bloqueos de caja, gastos, movimientos, productos, productos archivados, categorías, categorías archivadas, auditoría y perfiles de empleados en Firestore.

## Datos que conserva
El perfil Firestore del administrador conectado y su cuenta de Firebase Authentication.


## Nota v32
Publica obligatoriamente `firestore.rules` de v32 antes de probar Pago por separado. El nuevo esquema de ventas agrega el campo `pagos`.
