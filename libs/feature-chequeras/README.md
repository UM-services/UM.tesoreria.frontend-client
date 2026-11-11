# feature-chequeras

Vistas del módulo **Chequeras**. Contiene **Cobranzas** (importación de rendiciones, historial
de importados, generación de archivos, pago manual y baja de chequera) y **Consultas**
(planillas de cuotas por facultad y sede).

- Rutas: `cobranzaRoutes` (`/cobranzas/**`) y `consultaRoutes` (`/consultas/**`), montadas desde
  `apps/chequeras` con `loadChildren`.
- Backend Cobranzas: `/api/tesoreria/core/cobranza/**`, `/chequeraSerie`, `/chequeraCuota`,
  `/chequeraPago`, `/baja` y `/processBaja` en `tesoreria-core`.
- Backend Consultas: `GET /api/tesoreria/core/lectivo/reverse`,
  `GET /api/tesoreria/core/chequeraSerie/resumen/lectivo/{lectivoId}` y
  `POST /api/tesoreria/report/chequeras/planilla/detalle/zip` en `tesoreria-report`.
- Permisos Cobranzas: `chequeras.cobranzas.importar`, `chequeras.cobranzas.generar`,
  `chequeras.cobranzas.pagoManual` y `chequeras.cobranzas.baja`. La home autoriza con
  `permisoAlgunoGuard` (al menos una clave).
- Permiso Consultas: `chequeras.consultas.detalleCuotas`.
- Pantallas Cobranzas: `/cobranzas` (home), `/cobranzas/importar[/:canal]`,
  `/cobranzas/importaciones`, `/cobranzas/generar[/:canal]`, `/cobranzas/pago-manual` y
  `/cobranzas/baja`.
- Pantallas Consultas: `/consultas` (home) y `/consultas/detalle-cuotas`.
- Canales de importación: PagoMisCuentas, PAGAR, Rapipago, Débito Directo, Débito VISA,
  PayPerTIC y Click de Pagos.
- Canales de generación: PagoMisCuentas, Click de Pagos, Débito Directo, Débito VISA, PAGAR
  y PayPerTIC.
- Toda la lectura de archivos, el matching de chequeras y la imputación viven en el backend:
  la lib sólo sube, previsualiza, confirma y descarga.
- **Detalle de cuotas por facultad y sede:** el usuario elige un lectivo, tilda una o varias
  combinaciones facultad/sede y descarga un único ZIP con una planilla horizontal o vertical
  por cada fila. El backend valida la selección y arma el ZIP; el front no genera Excel.
