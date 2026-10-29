# ProyectoBarX v39 — respaldos multipartes (candidato)

## Funciones añadidas
- Configuración → Copias de seguridad: cálculo REAL leyendo los documentos de las colecciones operativas en Firestore, tamaño JSON no comprimido y estimación de partes de 1/2/4/8 MiB.
- Exporta ZIP sucesivos con `manifest.json` y `documents.json`, un identificador común, recuentos por parte, SHA-256 y número de parte; los ZIP se descargan con nombres consecutivos.
- Importación exige reautenticación mediante contraseña del administrador, el ZIP de la parte 1 seguido por los demás en orden, verificación de hash y totalidad antes de habilitar restauración.
- La restauración disponible es **solo recuperación de documentos ausentes**. Los existentes se preservan sin sobrescribir; progreso basado en documentos consultados/escritos. Si hay errores no se anuncia éxito.

## Limitaciones importantes
- CANDIDATO, NO APTO PARA PRODUCCIÓN: no se han probado Firebase Emulator, reglas de producción, archivos grandes ni cortes de conexión. Nunca restaurar sobre producción sin probar un respaldo y una recuperación en un proyecto separado.
- Descarga ZIP no garantiza guardado directamente en el escritorio: el navegador decide la carpeta y puede bloquear descargas múltiples.
- JSZip se obtiene por CDN; el respaldo requiere conexión y HTTPS (Web Crypto). La contraseña no se guarda.
- Los ZIP son respaldos de datos de colecciones LISTADAS, no copias nativas de Firestore; no incluyen subcolecciones futuras, Firebase Authentication, índices, reglas, Storage ni funciones cloud. Actualizar COLLECTIONS al añadir nuevas colecciones.
- La lectura se realiza colección a colección: SIN congelación de operaciones no hay snapshot atómico; debe pausarse la actividad del negocio mientras se exporta/restaura.
- Requerirá cuotas de lectura/escritura, espacio y memoria del navegador; respaldos enormes requieren un procedimiento de servidor y paginación/streaming real para no agotar RAM.
- El proceso web no sigue funcionando cuando se cierra pestaña. Si se interrumpe, algunos documentos pueden haberse escrito; reiniciar recuperación de faltantes desde parte 1 es la forma segura de continuar. No reanuda del punto exacto.
- No se admite recuperación completa con reemplazo/borrado, pues requiere autorización fuerte del lado del servidor y coordinación con la caja. Las reglas actuales pueden rechazar documentos históricos; se reportarán errores y la operación será parcial.
- El SHA-256 identifica corrupción accidental; no autentica el origen del ZIP ante un atacante que altere tanto manifest como contenido. Para firmas verificables se necesita un sistema de autenticidad independiente.
- Las protecciones de UI y la reautenticación no reemplazan las reglas de seguridad. No se ha implementado autorización temporal reforzada en servidor.

## Pruebas locales
Ejecutar `node --check backup.js`, `node --check pages.js`, y comprobar integridad del ZIP. Pendiente: pruebas con Firebase Emulator y escenarios extremos.
