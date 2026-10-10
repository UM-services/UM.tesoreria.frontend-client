import { Route } from '@angular/router';
import {
  administradorGuard,
  authGuard,
  SIN_ACCESO_RUTA,
  usuarioInternoGuard,
} from '@tesoreria/shared-api';
import { NoAccesoComponent } from '@tesoreria/ui-layout';

export const appRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('@tesoreria/ui-auth').then(m => m.LoginComponent),
  },
  {
    // Ruta pública de las guards de acceso; debe ir antes del wildcard.
    path: SIN_ACCESO_RUTA,
    component: NoAccesoComponent,
  },
  {
    path: 'dependencias',
    loadComponent: () =>
      import('@tesoreria/feature-administrador').then(m => m.DependenciasComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Sólo administradores: alta, configuración y habilitar/deshabilitar usuarios.
    path: 'usuarios',
    loadComponent: () => import('@tesoreria/feature-administrador').then(m => m.UsuariosComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: 'asignaciones',
    loadComponent: () =>
      import('@tesoreria/feature-administrador').then(m => m.AsignacionUsuariosComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Dependencias sobre las que cada usuario puede aprobar/rechazar el envío de pedidos.
    path: 'autorizantes-envio',
    loadComponent: () =>
      import('@tesoreria/feature-administrador').then(m => m.AutorizantesEnvioComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Referencia por ejercicio, perfiles de autoridad por monto y su asignación a usuarios.
    path: 'autoridades-presupuesto',
    loadComponent: () =>
      import('@tesoreria/feature-administrador').then(m => m.AutoridadesPresupuestoComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Sólo administradores: asignación de roles y permisos a cualquier usuario.
    path: 'permisos',
    loadComponent: () => import('@tesoreria/feature-permisos').then(m => m.PermisosComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Sólo administradores: ABM de roles y matriz rol × permiso.
    path: 'roles',
    loadComponent: () => import('@tesoreria/feature-permisos').then(m => m.RolesComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Sólo administradores: ABM del catálogo de permisos.
    path: 'catalogo',
    loadComponent: () => import('@tesoreria/feature-permisos').then(m => m.CatalogoComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    // Sólo administradores: simulador (lectura) del permiso efectivo de un usuario.
    path: 'simulador',
    loadComponent: () => import('@tesoreria/feature-permisos').then(m => m.SimuladorComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: 'proveedores',
    loadComponent: () => import('@tesoreria/feature-proveedores').then(m => m.ProveedoresComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: 'gastos',
    loadComponent: () => import('@tesoreria/feature-gastos').then(m => m.GastosComponent),
    canActivate: [authGuard, usuarioInternoGuard, administradorGuard],
  },
  {
    path: '',
    redirectTo: 'dependencias',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
  }
];
