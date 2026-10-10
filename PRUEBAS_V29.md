# ProyectoBarX v29 — Optimización Firestore

## Cambios aplicados
- Productos: listener en tiempo real (necesario para stock concurrente).
- Categorías: una carga por sesión, sin listener permanente.
- Ventas: listener únicamente del día actual; empleados reciben solo sus ventas del día.
- Gastos: listener únicamente del día actual para Admin.
- Caja: listener únicamente para la caja abierta del usuario.
- Usuarios: se cargan bajo demanda al entrar a Empleados/Movimientos/Gastos.
- Historial de ventas: carga bajo demanda, Admin últimos 31 días con máximo 250; empleado últimos 14 días por fecha.
- Movimientos: últimos 31 días, máximo 250.
- Gastos históricos: últimos 31 días, máximo 250.
- Historial de caja: Admin últimos 45 días, máximo 80; empleado consulta fechas recientes.
- Reportes: usa únicamente el periodo histórico cargado (últimos 31 días) para evitar leer toda la base.
- Filtro de fecha del historial: si se elige otra fecha, consulta únicamente ese día.
- Cierre de caja: reutiliza ventas ya cargadas para la caja del día; consulta Firestore solo para una caja pendiente de una fecha anterior.
- Validación cashLock: se reutiliza durante la sesión para no releer el bloqueo en cada venta.
- Persistencia local Firestore habilitada con sincronización entre pestañas.
- Configuración: panel de lecturas/escrituras/eliminaciones estimadas de esta instalación y almacenamiento mínimo conocido frente a la cuota gratuita.

## Pruebas estáticas realizadas
- `node --check` sobre todos los archivos JavaScript.
- Verificación de referencias de scripts/hojas/manifest del index.
- Verificación de que no exista listener global para sales, movements, expenses, cashSessions y users.
- Verificación de límites en consultas históricas.
- Verificación de versión de Service Worker v29.
- Verificación de integridad ZIP.

## Importante sobre el contador de Firebase
La app cliente no puede leer de forma segura las métricas facturadas globales de Cloud Monitoring. El panel de Configuración es preventivo y cuenta operaciones observadas por esta instalación. El botón “Abrir consumo oficial de Firebase” lleva al panel oficial para contrastar los valores globales.

El almacenamiento mostrado dentro de la app es el tamaño aproximado mínimo de los documentos actualmente conocidos/cargados por la app. Firestore factura además índices, metadatos y documentos históricos no descargados, por lo que el valor oficial debe verificarse en Firebase/Google Cloud.
