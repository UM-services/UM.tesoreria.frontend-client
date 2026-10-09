import { Routes } from '@angular/router';
import { permisoAlgunoGuard, permisoGuard } from '@tesoreria/shared-api';
import { PedidoBandejaComponent } from './pedido-bandeja/pedido-bandeja.component';
import { PedidoConsultaComponent } from './pedido-consulta/pedido-consulta.component';
import { PedidoDetalleComponent } from './pedido-detalle/pedido-detalle.component';
import { PedidoFormComponent } from './pedido-form/pedido-form.component';
import { PedidoListaComponent } from './pedido-lista/pedido-lista.component';

/**
 * Rutas del circuito de pedidos de compra. Los guards van por ruta (no en el padre)
 * porque cada pantalla atiende a un permiso distinto: iniciar, enviar (autorizante)
 * o consultar. El detalle lo comparten todos, por eso usa el guard alternativo.
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
        'compras.consultar_pedidos',
      ]),
    ],
  },
];
