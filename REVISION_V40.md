# ProyectoBarX v40 — CANDIDATO, NO PUBLICAR EN PRODUCCIÓN

## Implementado
- Búsqueda de productos en Nueva venta por nombre, categoría, SKU/código y código de barras; normalización de acentos y retención del texto al modificar el carrito.
- Backup de colecciones configuradas en un solo ZIP con manifiesto e integridad SHA-256. No es una instantánea transaccional: las escrituras concurrentes pueden producir copias inconsistentes. Detener actividad durante la exportación.
- Restauración **solo de documentos ausentes**: nunca elimina ni sobrescribe documentos existentes.
- Reautenticación de usuario Firebase por contraseña y comprobación de rol en cliente; almacenamiento local de cursor de progreso, reimportación del mismo ZIP para continuar. Presupuesto conservador de 5.000 DOCUMENTOS PROCESADOS por día del Pacífico, no cuota exacta de Firebase. Pausa en cualquier error, incluso falta de permisos.
- Indicador visual con porcentaje y cantidad procesada.
- Caché PWA v40.

## Bloqueadores de producción
1. No se han ejecutado pruebas E2E con Firebase Emulator, reglas ni concurrencia. Las reglas existentes pueden impedir crear determinados documentos y una restauración podría detenerse.
2. No hay una restauración completa reemplazando estado: datos distintos con el mismo ID no se reparan; no se eliminan excedentes; no restaura Authentication, reglas, índices ni subcolecciones no incluidas.
3. Falta una autorización de restauración verificable en servidor. La mera reautenticación en cliente no restringe a nivel servidor operaciones generales ya autorizadas por las reglas.
4. Checkpoint solo en localStorage: depende del dispositivo/navegador y se pierde si se borran datos; las escrituras confirmadas se pueden repetir de forma segura porque se comprueba existencia antes de escribir, pero una escritura en estado ambiguo no garantiza verificación exhaustiva.
5. La copia ZIP queda en RAM y puede exceder los recursos del navegador con bases grandes; requiere pruebas y exportación streaming.
6. Una exportación a mitad de actividad no garantiza consistencia referencial. Los registros de inventario, caja y ventas deben verificarse antes de activar operaciones tras recuperar.
7. No existe forma fiable desde SDK web de conocer cuánto de la cuota Spark diaria queda disponible. El límite preventivo no puede garantizar no alcanzar otras cuotas de Firebase.
8. Continuidad automática con el ordenador apagado no es posible en esta arquitectura.

## Pruebas
`node tests/v38-static.cjs` y `node tests/v40-static.cjs`; comprobar además cada JS con `node --check`.

## Publicación
**NO desplegar en producción**. Desplegar en proyecto Firebase de pruebas y corregir primero los bloqueadores. No sustituir reglas sin tests.
