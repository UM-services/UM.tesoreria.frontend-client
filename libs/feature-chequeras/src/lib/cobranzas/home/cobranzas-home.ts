import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermisoDirective } from '@tesoreria/ui-layout';

interface AccesoCobranza {
  label: string;
  path: string;
  descripcion: string;
  permiso: string;
  disponible: boolean;
}

@Component({
  selector: 'app-cobranzas-home',
  standalone: true,
  imports: [RouterModule, PermisoDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Cobranzas</p>
        <h1 class="um-page-title">Cobranzas</h1>
        <p class="um-page-desc">
          Importación de rendiciones, generación de archivos y operaciones de cobro.
        </p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (acceso of accesos; track acceso.path) {
          @if (acceso.disponible) {
            <a
              *uiPermiso="acceso.permiso"
              [routerLink]="acceso.path"
              class="um-card block transition hover:bg-um-surface"
            >
              <h2 class="text-lg font-semibold text-um-ink">{{ acceso.label }}</h2>
              <p class="mt-1 text-sm text-um-muted">{{ acceso.descripcion }}</p>
            </a>
          } @else {
            <div *uiPermiso="acceso.permiso" class="um-card opacity-60">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-um-ink">{{ acceso.label }}</h2>
                <span class="um-badge">Próximamente</span>
              </div>
              <p class="mt-1 text-sm text-um-muted">{{ acceso.descripcion }}</p>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class CobranzasHomeComponent {
  readonly accesos: AccesoCobranza[] = [
    {
      label: 'Importar archivos',
      path: '/cobranzas/importar',
      descripcion: 'Subir una rendición, previsualizarla y confirmar la imputación.',
      permiso: 'chequeras.cobranzas.importar',
      disponible: true,
    },
    {
      label: 'Importaciones',
      path: '/cobranzas/importaciones',
      descripcion: 'Ver los archivos importados por canal y sus registros no imputados.',
      permiso: 'chequeras.cobranzas.importar',
      disponible: true,
    },
    {
      label: 'Generar archivos',
      path: '/cobranzas/generar',
      descripcion: 'Generar archivos de facturación y débito.',
      permiso: 'chequeras.cobranzas.generar',
      disponible: true,
    },
    {
      label: 'Carga manual de pago',
      path: '/cobranzas/pago-manual',
      descripcion: 'Registrar o eliminar el pago de una cuota.',
      permiso: 'chequeras.cobranzas.pagoManual',
      disponible: true,
    },
    {
      label: 'Baja de chequera',
      path: '/cobranzas/baja',
      descripcion: 'Dar de baja una chequera o anular una baja existente.',
      permiso: 'chequeras.cobranzas.baja',
      disponible: true,
    },
  ];
}
