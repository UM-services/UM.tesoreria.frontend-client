import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Entrada del menú Consultas: lista las consultas disponibles. */
@Component({
  selector: 'app-consultas',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Contabilidad / Consultas</p>
          <h1 class="um-page-title">Consultas</h1>
          <p class="um-page-desc">Consultas contables de solo lectura.</p>
        </div>
      </div>
      <div class="um-card p-6">
        <ul class="space-y-2">
          <li>
            <a routerLink="/consultas/mayor" class="text-sm font-semibold text-um-ink underline">
              Mayor
            </a>
            <p class="text-sm text-um-muted">
              Movimientos y saldos por cuenta en un rango de fechas, con exportación a Excel.
            </p>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class ConsultasComponent {}