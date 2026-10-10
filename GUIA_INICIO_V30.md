# Guía de inicio - Proyecto X Bar v30

## Reinicio para entregar una instalación limpia
1. Ingrese como administrador.
2. Abra **Configuración**.
3. Pulse **Reiniciar y dejar sistema limpio**.
4. Ingrese la contraseña de reinicio configurada para el proyecto.
5. Confirme la eliminación.
6. El sistema conserva únicamente al administrador conectado y vuelve a activar el tutorial.

> Importante: desde una PWA web no se pueden eliminar de forma segura las cuentas ajenas de Firebase Authentication. El reinicio elimina sus perfiles de Firestore. Si se reutilizarán los mismos correos, borre las cuentas antiguas una vez desde Firebase Console > Authentication > Users.

## Tutorial integrado
El tutorial habilita las secciones en este orden:
1. Categorías.
2. Productos.
3. Inventario / movimientos de stock.
4. Empleados (opcional).
5. Caja.
6. Venta de prueba (se puede omitir).
7. Al finalizar, se habilitan todos los apartados.

## Datos que elimina el reinicio
Ventas, cajas, bloqueos de caja, gastos, movimientos, productos, productos archivados, categorías, categorías archivadas, auditoría y perfiles de empleados en Firestore.

## Datos que conserva
El perfil Firestore del administrador conectado y su cuenta de Firebase Authentication.
