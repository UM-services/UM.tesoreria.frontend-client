# feature-contable

Vistas del módulo Contable. Hoy: Cuentas bancarias (`CUENTAS_BANCARIAS_ROUTES`, ruta `/cuentas-bancarias` de la app `contable`).

La pantalla usa `/bancaria` del core por el gateway. Necesita el alias `/api/tesoreria/core/bancaria` (UM.tesoreria.core-service#515). Las reglas las decide el core; la pantalla valida solo el formato inmediato.

Pruebas: `npx nx test feature-contable`.
