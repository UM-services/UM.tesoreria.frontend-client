import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CANALES_GENERACION } from '../models/generacion.models';

@Component({
  selector: 'app-generar-lista',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Cobranzas / Generar</p>
        <h1 class="um-page-title">Generar archivos</h1>
        <p class="um-page-desc">
          Elegí el canal. El backend selecciona la deuda, arma el layout y devuelve el archivo;
          la pantalla sólo previsualiza y descarga.
        </p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (canal of canales; track canal.codigo) {
          <a [routerLink]="['/cobranzas/generar', canal.slug]" class="um-card block transition hover:bg-um-surface">
            <h2 class="text-lg font-semibold text-um-ink">{{ canal.nombre }}</h2>
            <p class="mt-1 text-sm text-um-muted">{{ canal.descripcion }}</p>
          </a>
        }
      </div>

      <a class="um-link-btn mt-6 inline-block" routerLink="/cobranzas">Volver a Cobranzas</a>
    </section>
  `,
})
export class GenerarListaComponent {
  readonly canales = CANALES_GENERACION;
}
