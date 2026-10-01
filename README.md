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
