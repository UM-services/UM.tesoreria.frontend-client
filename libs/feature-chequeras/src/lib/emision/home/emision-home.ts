import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-emision-home',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <section class="p-6">
      <header class="um-page-header">
        <p class="um-eyebrow">Chequeras / Emisión</p>
        <h1 class="um-page-title">Emisión de chequeras</h1>
        <p class="um-page-desc">
          Emití una chequera individual o retomá un borrador pendiente.
        </p>
      </header>

      <div class="mt-6 grid gap-4 md:grid-cols-2">
        <a class="um-card block" routerLink="/emision/individual">
          <h2 class="text-lg font-semibold text-um-ink">Emisión individual</h2>
          <p class="mt-2 text-sm text-um-muted">
            Buscá la persona, seleccioná la chequera, ajustá cuotas y beca, y emití.
          </p>
        </a>
        <a class="um-card block" routerLink="/emision/borradores">
          <h2 class="text-lg font-semibold text-um-ink">Borradores pendientes</h2>
          <p class="mt-2 text-sm text-um-muted">
            Retomá un borrador abierto o descartá los que ya no se van a usar.
          </p>
        </a>
        <a class="um-card block" routerLink="/emision/incompletas">
          <h2 class="text-lg font-semibold text-um-ink">Chequeras incompletas</h2>
          <p class="mt-2 text-sm text-um-muted">
            Repará las chequeras con cuotas sin precio: primero borradores, después la emisión.
          </p>
        </a>
      </div>
    </section>
  `,
})
export class EmisionHomeComponent {}
