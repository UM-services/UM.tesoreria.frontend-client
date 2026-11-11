# feature-pagos

Vistas del módulo Pagos. Hoy: Comprobantes de proveedor (`PAGOS_ROUTES`, ruta `/comprobantes` de la app `pagos`, montada con `loadChildren`). La reimpresión de comprobantes queda para una etapa posterior.

La pantalla consulta `GET /proveedorMovimiento/proveedor/{proveedorId}/{desde}/{hasta}/{geograficaId}` y `GET /proveedorMovimiento/{id}/detalle`, y anula con `DELETE /compra/comprobante/{id}` del core. El backend resuelve qué se puede anular (`anulacion.habilitada`, `motivosNoAnulable`, `requierePrivilegioOp`); la pantalla sólo traduce el resultado y no recalcula los saldos (`saldo`, `cancelado` e `importeAplicado` vienen calculados).

Permisos: `pagos.comprobantes.consultar` (ruta e ítem del menú), `pagos.comprobantes.anular` (botón de anulación) y `pagos.comprobantes.anular_op` (anular una orden de pago). Deben existir en `permisos.yaml` del core; el bundle de permisos se carga fail-closed, así que sin la clave la ruta y el botón quedan ocultos.

Las fechas se muestran con el pipe `umFecha` y se capturan con `<ui-input-fecha>` (`dd/mm/aaaa`); el rango viaja al core como día completo en UTC (`T00:00:00Z` / `T23:59:59Z`) y la sede se manda fija en `0`, igual que el formulario legacy, para ver todos los movimientos del proveedor.

Pruebas: `npx nx test feature-pagos`.
