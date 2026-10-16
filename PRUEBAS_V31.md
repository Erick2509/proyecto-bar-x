# Pruebas recomendadas - Proyecto X Bar v31

## 1. Inicio de sesión
- Administrador activo ingresa correctamente.
- Empleado activo ingresa correctamente.
- Empleado Inactivo no puede permanecer conectado.

## 2. Empleados
- Crear empleado con correo válido y contraseña de 6 o más caracteres.
- Intentar crear empleado sin nombre/apellido: debe rechazarse.
- Editar empleado y desactivarlo.
- Enviar restablecimiento de contraseña.

## 3. Categorías y productos
- Crear categoría válida y comprobar que no permita duplicado exacto por nombre.
- Crear producto con precios >= 0 y stock entero >= 0.
- Intentar stock negativo o decimal: debe rechazarse.
- Verificar que un icono escrito manualmente no pueda inyectar HTML.

## 4. Inventario
- Entrada de stock con cantidad entera positiva.
- Salida/merma sin stock suficiente: debe rechazarse.
- Tipo de movimiento inválido: debe rechazarse.

## 5. Caja y ventas
- Abrir caja y comprobar que no permita otra apertura simultánea para el mismo usuario.
- Registrar venta normal con Efectivo, Yape, Plin y Tarjeta.
- Confirmar que el stock disminuye exactamente por la cantidad vendida.
- Cerrar caja y revisar totales.
- Anular una venta como administrador y confirmar devolución de stock.

## 6. Reinicio seguro
- Ir a Configuración > Reiniciar sistema.
- Ingresar una contraseña incorrecta: el reinicio debe rechazarse.
- Repetir con la contraseña actual real del administrador: debe continuar.
- Confirmar que el administrador permanece y los datos operativos quedan vacíos.

## 7. Reglas Firestore
Publicar `firestore.rules` v31 antes de realizar estas pruebas. Si no se publican, algunas operaciones nuevas pueden devolver `permission-denied`.

## 8. PWA
- Desplegar por HTTPS.
- Abrir una vez con conexión para cargar los recursos.
- Confirmar instalación en Android/iOS compatible.
- Verificar que el Service Worker activo use caché `proyecto-x-v31`.
