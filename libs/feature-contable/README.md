# feature-contable

Vistas del módulo Contable de la app `contable`:

- **Cuentas bancarias** (`CUENTAS_BANCARIAS_ROUTES`, ruta `/cuentas-bancarias`): lista, alta,
  edición y baja contra `/bancaria` del core. Necesita el alias
  `/api/tesoreria/core/bancaria` y, para escribir, la tabla `gestion_escritura_historial`.
- **Asiento de ingreso** (`ASIENTO_INGRESO_ROUTES`, ruta `/asientos/ingreso`): consulta,
  regeneración unitaria y masivo por rango de fechas contra `/asientoIngreso` del core. El
  masivo es un job del core (`contable_asiento_ingreso_job*`, DDL `V425`) y la pantalla hace
  polling de su estado. Permisos: `contable.asiento_ingreso.consultar|regenerar|masivo`.

Las reglas (cuadre, faltantes, ejercicio bloqueado, imputaciones, cuentas de pago) las decide
el core; las pantallas sólo validan formato y muestran los mensajes del backend.

Pruebas: `npx nx test feature-contable`.
