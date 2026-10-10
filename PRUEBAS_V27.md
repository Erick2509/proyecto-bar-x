# Pruebas v27

Validaciones ejecutadas antes de empaquetar esta versión:

- Sintaxis de todos los archivos JavaScript con `node --check`.
- Referencias locales de `index.html`: ningún CSS/JS/icono referenciado falta en el proyecto.
- Balance y comprobaciones estáticas de `firestore.rules`.
- Render simulado de Caja:
  - historial oscuro sin la tabla blanca de Bootstrap,
  - Yape/Plin agrupados,
  - estado de caja abierta visible,
  - ventas de una caja abierta calculadas en vivo,
  - fechas formateadas.
- Flujo funcional simulado con Firestore en memoria:
  1. crear categoría,
  2. crear producto,
  3. agregar stock,
  4. abrir caja,
  5. realizar venta,
  6. registrar gasto,
  7. cerrar caja,
  8. anular venta,
  9. devolver stock,
  10. eliminar producto,
  11. eliminar categoría.
- Eliminación de producto verificada como borrado de `/products`, guardando solo copia técnica en `/deletedProducts`.
- Eliminación de categoría verificada como borrado de `/categories`, guardando solo copia técnica en `/deletedCategories`.
- Se verificó que una categoría con productos asociados NO se pueda eliminar para evitar productos huérfanos.
- Se verificó que una venta histórica pueda anularse aunque el producto ya haya sido eliminado; la devolución queda registrada en el archivo técnico sin revivir el producto.
- Paginación reforzada para móvil mediante `.pagination-hidden { display:none!important; }`.

## Importante
Estas pruebas son locales/simuladas y no escriben datos en tu Firebase de producción. Para que la eliminación real funcione en producción, debes publicar el archivo `firestore.rules` incluido en esta versión.
