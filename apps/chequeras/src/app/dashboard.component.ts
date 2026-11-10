import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermisoAlgunoDirective } from '@tesoreria/ui-layout';

/**
 * Dashboard del módulo Chequeras. Sólo expone accesos a secciones implementadas y
 * los filtra por permiso: no debe haber tarjetas de módulos inexistentes ni
 * placeholders que no naveguen.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, PermisoAlgunoDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="text-um-ink">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Dashboard</p>
        <h1 class="um-page-title">Dashboard de Chequeras</h1>
        <p class="um-page-desc">Accesos a los módulos disponibles.</p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <a
          *uiPermisoAlguno="permisosCobranzas"
          routerLink="/cobranzas"
          class="um-card block transition hover:bg-um-surface"
        >
          <h2 class="text-lg font-semibold text-um-ink">Cobranzas</h2>
          <p class="mt-1 text-sm text-um-muted">
            Importación de rendiciones, generación de archivos, pago manual, bajas y consultas.
          </p>
          <span class="mt-4 inline-block text-sm font-semibold text-um-primary">Ingresar →</span>
        </a>

        <a
          *uiPermisoAlguno="permisosConsultas"
          routerLink="/consultas"
          class="um-card block transition hover:bg-um-surface"
        >
          <h2 class="text-lg font-semibold text-um-ink">Consultas</h2>
          <p class="mt-1 text-sm text-um-muted">
            Planillas de cuotas por facultad y sede para un lectivo.
          </p>
          <span class="mt-4 inline-block text-sm font-semibold text-um-primary">Ingresar →</span>
        </a>

        <a routerLink="/personas" class="um-card block transition hover:bg-um-surface">
          <h2 class="text-lg font-semibold text-um-ink">Personas</h2>
          <p class="mt-1 text-sm text-um-muted">
            Consulta y administración de las personas del sistema.
          </p>
          <span class="mt-4 inline-block text-sm font-semibold text-um-primary">Ingresar →</span>
        </a>
      </div>
    </section>
  `,
})
export class DashboardComponent {
  readonly permisosCobranzas = [
    'chequeras.cobranzas.importar',
    'chequeras.cobranzas.generar',
    'chequeras.cobranzas.pagoManual',
    'chequeras.cobranzas.baja',
  ];
  readonly permisosConsultas = ['chequeras.consultas.detalleCuotas'];
}
