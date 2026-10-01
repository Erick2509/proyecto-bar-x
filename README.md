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
- Productos, categorías, inventario y stock mínimo.
- Entradas, salidas, mermas y ajustes +/-.
- Ventas con snapshot del producto/costo y stock transaccional.
- Efectivo, Yape, Plin y tarjeta.
- Anulación de ventas con devolución automática de stock.
- Gastos, caja por empleado, reportes y auditoría.
- PWA básica y Bootstrap responsive.
- Zona horaria America/Lima.

## Nota de seguridad
La creación de empleados usa una segunda instancia de Firebase Auth para no cerrar la sesión del administrador. Las eliminaciones son lógicas (Inactivo) para preservar historial.

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
- Dashboard, categorías, inventario, movimientos, gastos y ventas muestran la misma información que escritorio mediante desplazamiento horizontal cuando hace falta.
- Auditoría fue retirada del menú, rutas y carga de datos.
- Caché PWA actualizado a v6.
