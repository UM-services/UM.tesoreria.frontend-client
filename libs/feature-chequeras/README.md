# feature-chequeras

Vistas del módulo **Chequeras**. Hoy contiene **Cobranzas**: importación de rendiciones,
historial de importados, generación de archivos, pago manual y baja de chequera.

- Rutas: `cobranzaRoutes` (`/cobranzas/**`), montadas desde `apps/chequeras` con `loadChildren`.
- Backend: `/api/tesoreria/core/cobranza/**`, `/chequeraSerie`, `/chequeraCuota`,
  `/chequeraPago`, `/baja` y `/processBaja` en `tesoreria-core`.
- Permisos: `chequeras.cobranzas.importar`, `chequeras.cobranzas.generar`,
  `chequeras.cobranzas.pagoManual` y `chequeras.cobranzas.baja`. La home autoriza con
  `permisoAlgunoGuard` (al menos una clave).
- Pantallas: `/cobranzas` (home), `/cobranzas/importar[/:canal]`,
  `/cobranzas/importaciones`, `/cobranzas/generar[/:canal]`, `/cobranzas/pago-manual` y
  `/cobranzas/baja`.
- Canales de importación: PagoMisCuentas, PAGAR, Rapipago, Débito Directo, Débito VISA,
  PayPerTIC y Click de Pagos.
- Canales de generación: PagoMisCuentas, Click de Pagos, Débito Directo, Débito VISA, PAGAR
  y PayPerTIC.
- Toda la lectura de archivos, el matching de chequeras y la imputación viven en el backend:
  la lib sólo sube, previsualiza, confirma y descarga.
