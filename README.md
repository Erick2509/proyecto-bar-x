# PROYECTO X — Firebase + HTML/CSS/JS + Bootstrap

## Configuración
1. Crea un proyecto Firebase y una app Web.
2. Activa **Authentication > Email/Password** y **Firestore Database**.
3. Copia la configuración Web en `firebase-config.js`.
4. Pega `firestore.rules` en Firestore > Rules y publica.
5. En Authentication crea el primer usuario administrador.
6. En Firestore crea la colección `users` y un documento cuyo ID sea EXACTAMENTE el UID del administrador:
   - email: correo del admin
   - nombres: nombre
   - apellidos: apellido
   - role: `admin`
   - estado: `Activo`
   - dni: ""
   - telefono: ""
7. Sirve la carpeta mediante HTTPS (Vercel, Firebase Hosting, etc.). No abras `index.html` directamente con file://.

## Incluye
- Firebase Authentication y Firestore en lugar de localStorage.
- Roles Admin/Empleado.
- Productos, categorías, stock y stock mínimo.
- Entradas, salidas, mermas y ajustes +/-.
- Ventas con snapshot del producto/costo y stock transaccional.
- Efectivo, Yape, Plin y tarjeta.
- Anulación de ventas con devolución automática de stock.
- Gastos, caja por empleado, reportes y auditoría.
- PWA básica y Bootstrap responsive.
- Zona horaria America/Lima.

## Nota de seguridad
La creación de empleados usa una segunda instancia de Firebase Auth para no cerrar la sesión del administrador. Los empleados se desactivan para preservar acceso/historial; productos y categorías se eliminan del catálogo y se archiva una copia técnica para trazabilidad.

## Versión v4 - producción
- Corregida normalización de perfiles `nombre/nombres`, `apellido/apellidos`, `activo/Activo`.
- Carga de colecciones según rol para evitar errores de permisos en empleados.
- Reglas Firestore endurecidas: catálogo solo Admin; empleados solo pueden descontar stock durante ventas; caja ligada al usuario.
- Mensajes visibles para errores de Firestore y promesas no controladas.
- Responsive/táctil reforzado para Android, iPhone, tablet y escritorio.

### IMPORTANTE AL ACTUALIZAR DESDE v3
Conserva tu `firebase-config.js` que ya funciona en Vercel y reemplaza el resto de archivos por los de v4. Después publica **firestore.rules** en Firebase Console > Firestore Database > Reglas.


## v6 móvil
- Ninguna tabla de datos se oculta en móvil.
- Dashboard, categorías, productos, movimientos, gastos y ventas muestran la misma información que escritorio mediante desplazamiento horizontal cuando hace falta.
- Auditoría fue retirada del menú, rutas y carga de datos.
- Caché PWA actualizado a v6.


## v7 móvil
Todas las tablas se reorganizan como tarjetas verticales en pantallas de hasta 768 px. No se eliminan campos ni acciones; los encabezados pasan a ser etiquetas dentro de cada tarjeta. Escritorio conserva las tablas.


## v15 - Corrección apertura de caja
- Corrige la primera apertura de caja para empleados: se eliminó la lectura transaccional de un documento inexistente que Firestore rechazaba.
- Mantiene un único documento de caja por usuario y fecha.
- Las reglas impiden reabrir/sobrescribir una caja existente y solo permiten Abierta → Cerrada.
- La auditoría no hace fallar una apertura que ya se realizó correctamente.
- Caché PWA actualizado a proyecto-x-v15.

## v16 - Protección de acciones
- Confirmaciones para venta, stock, movimientos, gastos y caja.
- Acciones destructivas mantienen confirmación explícita.
- Bloqueo anti doble clic/toque en operaciones de escritura.
- Capa adicional de bloqueo en Store para evitar escrituras duplicadas concurrentes.
- Validación de cantidades, costos, montos de caja y gastos antes de confirmar.


## v20
Corrige etiquetas invisibles en tarjetas responsive después de aplicar filtros dinámicos en Productos e Historial de ventas. Tras reconstruir filas se vuelven a generar los atributos data-label.

## v22
Etiquetas responsive incorporadas directamente en filas de Gastos, Movimientos, Empleados e Historial de Caja, para conservarlas tras filtros, actualizaciones y paginación. Mantiene las correcciones directas de Productos e Historial de ventas.

## v25
- Anulación corregida incluso para ventas de cajas cerradas; ajusta el resumen de caja y devuelve stock.
- Modales de confirmación con fondo estático: no se cierran al tocar/clicar fuera; solo Cancelar o X.


## v26 - Integridad y estabilidad
- Modales de confirmación ya no quedan bloqueados en “Procesando…” cuando una operación falla.
- Eliminaciones lógicas de empleados, categorías y productos cierran correctamente el modal y reportan errores.
- Firebase Authentication exige mínimo 6 caracteres al crear empleados.
- En edición de empleado el correo de acceso queda de solo lectura para evitar desincronizar Firestore/Auth; se añadió envío de enlace de restablecimiento de contraseña.
- Apertura de caja protegida entre pestañas y dispositivos mediante `cashLocks/{uid}` y transacción Firestore.
- Las ventas validan que la caja corresponda al bloqueo activo del usuario y endurecen la forma del documento en reglas.
- Las actualizaciones en tiempo real se difieren mientras el usuario escribe o tiene un modal abierto, evitando perder formularios/filtros por rerender.
- Service Worker actualizado a `proyecto-x-v26`, con actualización de red prioritaria y limpieza de cachés anteriores.
- Eliminado `data.js` de producción para no publicar credenciales/datos de demostración antiguos.

### IMPORTANTE
Publica el archivo `firestore.rules` de esta versión antes de probar apertura de caja o ventas. La colección `cashLocks` se crea automáticamente al abrir caja.


## v27 - Caja y eliminación real
- Rediseño del historial de caja: tema oscuro consistente, mayor espacio para historial, estados y diferencias con badges, fecha/hora legibles y Yape/Plin agrupados.
- Las cajas abiertas muestran sus ventas actuales en el historial en vez de guiones.
- Productos y categorías ahora se eliminan de las colecciones activas (`products` / `categories`) en lugar de cambiar a Inactivo.
- Antes de eliminar una categoría se comprueba que no tenga productos asociados.
- Se conserva una copia técnica en `deletedProducts` / `deletedCategories` para trazabilidad y para permitir anular ventas históricas sin revivir productos eliminados.
- Caché PWA actualizado a `proyecto-x-v27`.
- La paginación ahora usa una clase con `display:none!important`, por lo que también funciona en las tarjetas móviles responsive.
