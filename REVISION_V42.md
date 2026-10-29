# ProyectoBarX v42 — Restauración histórica (candidato NO PRODUCCIÓN)

## Qué cambia
- Crea una autorización temporal `restoreGrants/{uid}` para administradores activos; vence en 10 minutos como máximo.
- Al restaurar exige reautenticación por contraseña y crea autorización con caducidad.
- Las colecciones históricas `sales`, `jornadas`, `movements`, `cashMovements`, `cashSessions` y `audits` aceptan **CREATE** excepcional de un administrador con autorización válida.
- Las reglas normales de ventas continúan activas; no cambia el acceso para empleados ni habilita UPDATE/DELETE excepcional.
- El restaurador sigue creando únicamente documentos que no existen y conserva el avance.

## Riesgos y requisitos
- **No desplegar sin validar con Firebase Emulator y restauración de prueba.** No se han probado reglas contra Firebase activo.
- Las credenciales y las reglas de Firestore no se encuentran dentro del ZIP de datos.
- La reautenticación con contraseña es una barrera de la interfaz web; un administrador con sesión válida y acceso directo al SDK puede solicitar una autorización temporal. El límite de confianza sigue siendo el rol de administrador. Para exigir reautenticación criptográficamente comprobable en el servidor se requeriría un componente de servidor confiable o controles adicionales.
- El permiso excepcional de CREATE no valida uno por uno los campos de documentos históricos, pues sus esquemas varían. Úsese solo con administradores de confianza y desactívese/elímínese después de finalizar la recuperación.
- Para usar v42 hay que publicar el nuevo `firestore.rules` primero y luego el frontend. Una regla no publicada seguirá bloqueando la venta.
- Durante la restauración se deben suspender ventas y operaciones ordinarias.
- No se probó la reanudación, seguridad de las reglas, integridad de las referencias ni simultaneidad de caja.

## Prueba de aceptación pendiente
1. En proyecto Spark de pruebas, crear administrador legítimo.
2. Publicar reglas; verificar que empleado normal no puede crear ventas históricas.
3. Reautenticar admin, importar el ZIP, verificar autorización temporal y recuperar todos los documentos faltantes.
4. Comprobar que un administrador sin autorización temporal no puede usar la ruta excepcional.
5. Comprobar vencimiento, imposibilidad de sobrescribir y cierre de sesión.
6. Verificar totales y relaciones entre colecciones.
