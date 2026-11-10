# feature-contable

Vistas del módulo Contable. Hoy: Cuentas bancarias (`CUENTAS_BANCARIAS_ROUTES`, ruta `/cuentas-bancarias` de la app `contable`).

La pantalla usa `/bancaria` del core por el gateway. Necesita el alias `/api/tesoreria/core/bancaria` (UM.tesoreria.core-service#515) y, para escribir, la tabla `gestion_escritura_historial` (UM.tesoreria.core-service#404) en el ambiente. Las reglas las decide el core; la pantalla valida solo el formato inmediato.

Pruebas: `npx nx test feature-contable`.
