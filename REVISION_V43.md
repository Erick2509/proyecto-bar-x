# ProyectoBarX v43 — candidato, NO PRODUCCIÓN

- Progreso por colección y total de documentos.
- Documento system/restoreState bloquea operaciones normales en reglas durante restauración; solo creación con grant activo en mantenimiento.
- Se inicia bloqueo antes de importar documentos y se libera únicamente al completar el bucle de importación; si falla la liberación, el sistema permanece bloqueado.
- El bloqueo se conserva ante una pausa y requiere volver a importar ZIP para terminar.
- NO hay verificación independiente de referencias cruzadas, ni prueba con Emulator, ni confirmación de consistencia multiusuario.
- Las reglas deben desplegarse a la vez que el frontend; probar con Spark de ensayo antes de producción.
- No usar para base real sin revisar reglas y ensayar restauración completa con usuarios simultáneos.
