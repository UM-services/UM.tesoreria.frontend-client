import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CANALES_IMPORTACION } from '../models/cobranza.models';

@Component({
  selector: 'app-importar-lista',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Cobranzas / Importar</p>
        <h1 class="um-page-title">Importar archivos</h1>
        <p class="um-page-desc">
          Elegí el canal. El archivo se valida y se imputa en el servidor; la pantalla sólo
          muestra la previsualización antes de confirmar.
        </p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (canal of canales; track canal.codigo) {
          @if (canal.disponible) {
            <a
              [routerLink]="['/cobranzas/importar', canal.slug]"
              class="um-card block transition hover:bg-um-surface"
            >
              <h2 class="text-lg font-semibold text-um-ink">{{ canal.nombre }}</h2>
              <p class="mt-1 text-sm text-um-muted">{{ canal.descripcion }}</p>
            </a>
          } @else {
            <div class="um-card opacity-60">
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-lg font-semibold text-um-ink">{{ canal.nombre }}</h2>
                <span class="um-badge">Próximamente</span>
              </div>
              <p class="mt-1 text-sm text-um-muted">{{ canal.descripcion }}</p>
            </div>
          }
        }
      </div>

      <a class="um-link-btn mt-6 inline-block" routerLink="/cobranzas">Volver a Cobranzas</a>
    </section>
  `,
})
export class ImportarListaComponent {
  readonly canales = CANALES_IMPORTACION;
}
