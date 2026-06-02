import { Routes } from '@angular/router';
import { OcDashboardComponent } from './oc-dashboard/oc-dashboard.component';
import { OcDetailComponent } from './oc-detail/oc-detail.component';
import { OcCreateComponent } from './oc-create/oc-create.component';

export const ordenCompraRoutes: Routes = [
  { path: '', component: OcDashboardComponent },
  { path: 'nueva', component: OcCreateComponent },
  { path: 'oc/:id', component: OcDetailComponent }
];
