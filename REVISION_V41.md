# ProyectoBarX v41 — corrección del restaurador (candidato)

## Cambios
- Mantiene visible el motivo de pausa, con colección, ID de documento, código y mensaje de Firestore.
- Reintenta fallos de conectividad temporales con espera exponencial limitada; no reintenta permisos denegados.
- Confirma cada documento creado mediante lectura del servidor antes de avanzar el cursor.
- Guarda el punto de continuación y el último error en localStorage. Un documento existente se omite sin sobrescribirlo.
- Reemplaza la barra anterior en vez de añadir barras repetidas.
- Actualiza caché PWA a proyecto-x-v41.

## Advertencias de seguridad y uso
- NO es una restauración completa: solo crea documentos faltantes.
- La contraseña habilita la interfaz pero las reglas de Firestore también deben permitir cada operación.
- Las reglas de v40 NO se relajaron. Los documentos históricos pueden estar sujetos a validaciones que impidan su recreación.
- La verificación comprueba existencia del documento en servidor, no equivalencia total de contenidos ni relaciones.
- No se ejecutaron pruebas contra tu Firestore real ni Firebase Emulator. NO desplegar directamente sobre producción sin ensayos.
- El ZIP de respaldo ya descargado es compatible: no necesita convertirse.
- Nunca utilices «Reiniciar y dejar sistema limpio» para continuar una recuperación.
