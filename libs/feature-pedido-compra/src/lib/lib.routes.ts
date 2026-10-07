import { Routes } from '@angular/router';
import { PedidoListaComponent } from './pedido-lista/pedido-lista.component';
import { PedidoFormComponent } from './pedido-form/pedido-form.component';
import { PedidoDetalleComponent } from './pedido-detalle/pedido-detalle.component';

export const pedidoCompraRoutes: Routes = [
  { path: '', component: PedidoListaComponent },
  { path: 'nuevo', component: PedidoFormComponent },
  { path: ':id', component: PedidoDetalleComponent },
];
