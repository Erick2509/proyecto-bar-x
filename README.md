# ProyectoBarX v34

Versión corregida de filtros, totales dinámicos y continuidad de caja durante la madrugada.

# PROYECTO X — Firebase + HTML/CSS/JS + Bootstrap

## v34 - Filtros rápidos y totales corregidos

- Corregido el error de consola de tablas responsivas.
- Gastos e Historial recalculan primero el monto y después redibujan la tabla.
- Búsquedas con debounce corto para evitar trabajo innecesario por cada tecla.
- Cambio de rango muestra datos disponibles inmediatamente y sincroniza Firestore en segundo plano.
- El total no se queda en “Actualizando…” aunque falle una mejora visual secundaria.
- Caja continua de v33 se mantiene: no se cierra automáticamente a medianoche.

Consulta `CAMBIOS_V34.md` y `PRUEBAS_V34.md`.


## v33 - Totales dinámicos + caja continua durante la madrugada

- Módulo visible **Inventario**.
- Pago por separado en dos medios de pago.
- CRUD de gastos manuales y filtros por rango.
- Filtros por rango en movimientos e historial de ventas.
- Totales dinámicos según filtros.
- Monto inicial de Caja separado de ventas.
- Dashboard por medios de pago.
- Precio de compra maestro preservado en nuevas entradas de stock.
- Selector ampliado con más de 300 emojis y entrada libre.
- Caché PWA `proyecto-x-v34`.

Consulta `CAMBIOS_V33.md`, `PRUEBAS_V33.md` y `GUIA_INICIO_V32.md`.


### Cambios clave de v33
- Historial de ventas: el total se recalcula con cada filtro de fecha, búsqueda y método.
- Si se filtra por un método de pago, los pagos divididos suman únicamente la parte correspondiente a ese método.
- Gastos: el total y la cantidad de registros se recalculan con cada filtro y rango de fechas.
- Caja continua: no se cierra por cambio de fecha. Puede abrirse en la noche y cerrarse al finalizar la atención del día siguiente.
- El cierre de caja suma todas las ventas vinculadas a esa sesión mediante `cajaId`, sin importar la fecha de cada venta.
- La interfaz de Caja explica el flujo en 3 pasos y avisa claramente cuando una sesión atravesó medianoche.
- El sistema detecta el cambio de día y cambia automáticamente los datos "de hoy" sin cerrar la caja.

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
- Inventario, categorías, stock y stock mínimo.
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
- Mantiene una única caja abierta por usuario. La sesión puede cruzar medianoche y continúa hasta que se cierre manualmente.
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


## v28 - Caja y eliminación real
- Rediseño del historial de caja: tema oscuro consistente, mayor espacio para historial, estados y diferencias con badges, fecha/hora legibles y Yape/Plin agrupados.
- Las cajas abiertas muestran sus ventas actuales en el historial en vez de guiones.
- Productos y categorías ahora se eliminan de las colecciones activas (`products` / `categories`) en lugar de cambiar a Inactivo.
- Antes de eliminar una categoría se comprueba que no tenga productos asociados.
- Se conserva una copia técnica en `deletedProducts` / `deletedCategories` para trazabilidad y para permitir anular ventas históricas sin revivir productos eliminados.
- Caché PWA actualizado a `proyecto-x-v28`.
- La paginación ahora usa una clase con `display:none!important`, por lo que también funciona en las tarjetas móviles responsive.


## v28 - Selector ampliado de iconos
- Selector visual con más de 180 opciones agrupadas por tipo.
- Filtros por categoría y búsqueda por palabras como cerveza, comida, promoción, bebida, etc.
- Compatible con iconos personalizados escritos manualmente.
- Diseño responsive para celular y escritorio.

## v29 — Optimización de Firestore
Esta versión reduce las lecturas cargando en tiempo real solo los datos operativos necesarios (stock, ventas del día, gastos del día y caja abierta). Los historiales se cargan bajo demanda y con límites.


## v30 - Reinicio y puesta en marcha
- Configuración simplificada para entrega y puesta en marcha.
- Tutorial inicial con apartados bloqueados/desbloqueados por requisitos.
- El administrador conectado se conserva durante el reinicio.
- El mecanismo de reinicio fue reemplazado y reforzado en v31; usar `GUIA_INICIO_V31.md`.

## v31 - Corrección de seguridad e integridad
- El reinicio total ya no usa una contraseña fija visible en el código. Ahora exige reautenticación con la contraseña real del administrador en Firebase Authentication.
- `data.js` fue retirado físicamente del proyecto para que no se publiquen credenciales antiguas de demostración.
- Creación, edición, desactivación y restablecimiento de empleados cuentan con validación de rol también en la capa Store.
- Si Firebase Authentication crea un empleado pero falla la creación de su perfil Firestore, se intenta eliminar inmediatamente la cuenta recién creada para evitar usuarios huérfanos.
- Productos, categorías, movimientos manuales y cantidades del carrito tienen validaciones adicionales de tipo, rango e integridad.
- Se bloquean cantidades negativas, fraccionarias o inválidas en el carrito y movimientos de stock.
- Las ventas vuelven a validar producto activo, stock, cantidades y precios dentro de la transacción antes de descontar inventario.
- Se reforzó el escape HTML de nombres, iconos, historial y atributos dinámicos para reducir riesgo de XSS almacenado.
- Fechas y horas renderizadas se validan antes de mostrarse.
- Reglas Firestore reforzadas con validación de formato, tipos, tamaños, estados, número de venta y tamaño máximo del carrito.
- Caché PWA actualizado a `proyecto-x-v31`.
- Se habilitó el zoom del navegador en móvil para mejorar accesibilidad.
- Ver `GUIA_INICIO_V31.md` y `PRUEBAS_V31.md`.

### Nota de arquitectura
La aplicación sigue siendo una PWA cliente conectada directamente a Firestore. Las reglas reducen el riesgo, pero una validación contable completamente resistente a un cliente autenticado manipulado requiere mover el registro de ventas/inventario a un backend confiable (por ejemplo, una API propia o una función de servidor). Para un entorno interno con empleados identificados, la v31 mantiene la arquitectura actual sin introducir esa complejidad adicional.
