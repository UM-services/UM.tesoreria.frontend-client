import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermisoAlgunoDirective } from '@tesoreria/ui-layout';

@Component({
  selector: 'app-consultas-home',
  standalone: true,
  imports: [RouterModule, PermisoAlgunoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Consultas</p>
        <h1 class="um-page-title">Consultas</h1>
        <p class="um-page-desc">Planillas y reportes de chequeras por lectivo.</p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <a
          *uiPermisoAlguno="permisosDetalle"
          routerLink="/consultas/detalle-cuotas"
          class="um-card block transition hover:bg-um-surface"
        >
          <h2 class="text-lg font-semibold text-um-ink">
            Detalle de cuotas por facultad y sede
          </h2>
          <p class="mt-1 text-sm text-um-muted">
            Descargá las planillas horizontal o vertical de las facultades y sedes de un
            lectivo, de chequeras emitidas o de borradores abiertos.
          </p>
        </a>
      </div>
    </section>
  `,
})
export class ConsultasHomeComponent {
  readonly permisosDetalle = [
    'chequeras.consultas.detalleCuotas',
    'chequeras.consultas.detalleCuotasBorrador',
  ];
}
