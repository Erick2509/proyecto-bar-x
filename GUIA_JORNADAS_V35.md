# Guía rápida — Jornadas v35

## Antes de usar la versión
1. Reemplaza los archivos de la aplicación por los de v35.
2. Conserva tu `firebase-config.js` si ya está conectado al Firebase correcto.
3. En Firebase Console abre **Firestore Database → Rules**.
4. Copia el contenido de `firestore.rules` de v35 y pulsa **Publicar**.
5. Publica nuevamente el sitio/PWA.
6. Cierra y vuelve a abrir la PWA para que tome el caché `proyecto-x-v35`.

## Flujo normal del bar

### Al comenzar la atención
Entra a **🌙 Jornada y Caja** y pulsa **Abrir jornada y comenzar**. Ingresa el efectivo con el que inicia la caja.

El sistema crea automáticamente una jornada como `JOR-ABC123`. El monto inicial queda registrado por separado y no se suma a ventas.

### Durante la noche
Vende normalmente. No importa si pasan las 12:00 a. m.; la jornada continúa abierta.

Todas las operaciones mantienen su fecha/hora real y, al mismo tiempo, quedan relacionadas con la jornada abierta.

### Si entra o sale efectivo que no es una venta
Usa:
- **➕ Ingreso de efectivo** para sencillo u otro dinero agregado a la caja.
- **➖ Retiro de efectivo** para retirar dinero físico durante la jornada.

Estos movimientos afectan el efectivo esperado, pero no las ventas.

### Al registrar un gasto
Indica cómo fue pagado. Si eliges **Efectivo**, y hay una jornada abierta, ese gasto se descuenta del efectivo esperado al cierre.

### Al terminar realmente la atención
En **Jornada y Caja** revisa:
- ventas;
- efectivo de ventas;
- Yape/Plin;
- tarjeta;
- gastos;
- ingresos y retiros;
- efectivo esperado.

Cuenta el efectivo físico, ingrésalo en **Efectivo real contado al cierre** y pulsa **Finalizar jornada y cerrar caja**.

## Ejemplo nocturno
- Apertura: 16/10/2026 20:00
- Cambio de fecha: 17/10/2026 00:00
- Cierre real: 17/10/2026 05:30

Todo pertenece a una sola jornada. No hay que cerrar a medianoche ni abrir otra caja.

## Fórmula del cierre
`Monto inicial + Efectivo vendido + Ingresos - Retiros - Gastos en efectivo = Efectivo esperado`

Ejemplo:
- Monto inicial: S/ 100
- Ventas efectivo: S/ 500
- Sencillo agregado: S/ 50
- Retiro: S/ 100
- Gasto en efectivo: S/ 40
- Efectivo esperado: S/ 510

## Jornada olvidada abierta
El sistema no la cierra por su cuenta. Si la jornada cruzó el día o lleva 14 horas o más, al iniciar sesión mostrará un aviso con dos opciones:
- **Continuar jornada**
- **Revisar / finalizar**

Esto evita perder ventas por un cierre automático incorrecto.
