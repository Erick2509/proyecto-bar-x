# v47 – Descuentos en ventas

- Descuento en soles o porcentaje en el modal de pago.
- Nuevo total visual y validación contra subtotal de productos actualizados dentro de la transacción.
- Descuentos superiores al 20% solo con sesión administradora.
- Pago dividido debe cuadrar con total neto.
- Venta guarda subtotal, descuentoTipo, descuentoValor, descuentoMonto y total.
- Detalle de venta y Excel muestran descuentos. Reportes, caja y jornadas ya se basan en total neto y pagos.
- Requiere publicar firestore.rules actualizado antes de probar ventas con descuento o sin él.
- Candidato: sin prueba end-to-end Firebase Emulator / reglas ni con usuarios reales.
- El historial de auditoría todavía registra la operación de venta, pero no tiene campo estructurado para desglose del descuento.
- El resumen de productos vendidos muestra ingresos brutos por artículos: no distribuye el descuento total por producto.
