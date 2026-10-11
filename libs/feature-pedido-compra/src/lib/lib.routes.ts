import { Routes } from '@angular/router';
import { permisoAlgunoGuard, permisoGuard } from '@tesoreria/shared-api';
import { CotizacionProcesoDetalleComponent } from './cotizacion-proceso-detalle/cotizacion-proceso-detalle.component';
import { CotizacionProcesoFormComponent } from './cotizacion-proceso-form/cotizacion-proceso-form.component';
import { CotizacionProcesoListaComponent } from './cotizacion-proceso-lista/cotizacion-proceso-lista.component';
import { CotizacionProcesoPedidasComponent } from './cotizacion-proceso-pedidas/cotizacion-proceso-pedidas.component';
import { CotizacionAdjudicacionComponent } from './cotizacion-adjudicacion/cotizacion-adjudicacion.component';
import { PedidoBandejaComponent } from './pedido-bandeja/pedido-bandeja.component';
import { PedidoConsultaComponent } from './pedido-consulta/pedido-consulta.component';
import { PedidoDetalleComponent } from './pedido-detalle/pedido-detalle.component';
import { PedidoFormComponent } from './pedido-form/pedido-form.component';
import { PedidoListaComponent } from './pedido-lista/pedido-lista.component';
import { PedidoPresupuestoComponent } from './pedido-presupuesto/pedido-presupuesto.component';
import { PedidoRevisionComponent } from './pedido-revision/pedido-revision.component';

/**
 * Rutas del circuito de pedidos de compra. Los guards van por ruta (no en el padre)
 * porque cada pantalla atiende a un permiso distinto: iniciar, enviar (autorizante),
 * revisar/estimar (compras), autorizar el presupuesto (autoridad por monto) o consultar.
 * El detalle lo comparten todos, por eso usa el guard alternativo.
 */
export const pedidoCompraRoutes: Routes = [
  {
    path: '',
    component: PedidoListaComponent,
    canActivate: [permisoGuard('compras.iniciar_pedido')],
  },
  {
    path: 'nuevo',
    component: PedidoFormComponent,
    canActivate: [permisoGuard('compras.iniciar_pedido')],
  },
  {
    path: 'bandeja',
    component: PedidoBandejaComponent,
    canActivate: [permisoGuard('compras.enviar_pedido')],
  },
  {
    path: 'revision',
    component: PedidoRevisionComponent,
    canActivate: [permisoGuard('compras.estimar')],
  },
  {
    path: 'presupuesto',
    component: PedidoPresupuestoComponent,
    canActivate: [permisoGuard('compras.presupuesto.autorizar')],
  },
  {
    path: 'consulta',
    component: PedidoConsultaComponent,
    canActivate: [permisoGuard('compras.consultar_pedidos')],
  },
  {
    path: ':id/editar',
    component: PedidoFormComponent,
    canActivate: [permisoGuard('compras.iniciar_pedido')],
  },
  {
    path: ':id',
    component: PedidoDetalleComponent,
    canActivate: [
      permisoAlgunoGuard([
        'compras.iniciar_pedido',
        'compras.enviar_pedido',
        'compras.estimar',
        'compras.presupuesto.autorizar',
        'compras.consultar_pedidos',
      ]),
    ],
  },
];

/**
 * Rutas de los procesos de cotización (etapa 6B). Todo el circuito lo atiende el dpto. de
 * compras, por eso las tres pantallas comparten el permiso {@code compras.cotizaciones.gestionar}.
 */
export const cotizacionRoutes: Routes = [
  {
    path: '',
    component: CotizacionProcesoListaComponent,
    canActivate: [permisoGuard('compras.cotizaciones.gestionar')],
  },
  {
    path: 'nuevo',
    component: CotizacionProcesoFormComponent,
    canActivate: [permisoGuard('compras.cotizaciones.gestionar')],
  },
  {
    // Bandeja transversal (Etapa 7, Pieza A); va antes de ':id' para no capturarse como id.
    path: 'pedidas',
    component: CotizacionProcesoPedidasComponent,
    canActivate: [permisoGuard('compras.cotizaciones.gestionar')],
  },
  {
    // Adjudicación por monto (Etapa 7, Pieza B); antes de ':id'.
    path: 'adjudicacion',
    component: CotizacionAdjudicacionComponent,
    canActivate: [permisoGuard('compras.adjudicacion.autorizar')],
  },
  {
    path: ':id',
    component: CotizacionProcesoDetalleComponent,
    canActivate: [permisoGuard('compras.cotizaciones.gestionar')],
  },
];
