import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OrdenCompraService } from '../data-access/orden-compra.service';
import { RolSimulado, OrdenCompraEstado } from '../models/orden-compra.models';

@Component({
  selector: 'tesoreria-oc-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <!-- SIMULADOR DE ROLES -->
      <div
        class="bg-um-selected p-4 rounded-xl border border-um-border flex justify-between items-center shadow-sm"
      >
        <div>
          <h3 class="font-bold text-um-primary">Simulador de Roles (Testing)</h3>
          <p class="text-xs text-um-primary">
            Cambie el rol para habilitar distintas acciones (Aprobar, Anular, Crear).
          </p>
        </div>
        <select
          [ngModel]="service.currentRol()"
          (ngModelChange)="service.setRol($event)"
          class="font-medium text-sm border-um-border rounded-lg shadow-sm text-um-primary bg-white"
        >
          @for (r of roles; track r) {
            <option [value]="r">{{ r }}</option>
          }
        </select>
      </div>

      <div class="flex justify-between items-center">
        <div>
          <h1 class="um-page-title">Órdenes de Compra</h1>
          <p class="text-sm text-um-muted">Gestión, seguimiento y aprobación de adquisiciones.</p>
        </div>
        @if (service.currentRol() === RolSimulado.DIR_COMPRAS) {
          <button
            routerLink="nueva"
            class="bg-um-primary hover:bg-um-primary-hover text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors"
          >
            + Nueva Orden
          </button>
        }
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-um-border overflow-hidden">
        <table class="min-w-full divide-y divide-um-border text-sm">
          <thead class="bg-um-surface">
            <tr>
              <th
                class="px-6 py-3 text-left font-semibold text-um-muted uppercase tracking-wider text-xs"
              >
                Nro OC
              </th>
              <th
                class="px-6 py-3 text-left font-semibold text-um-muted uppercase tracking-wider text-xs"
              >
                Proveedor
              </th>
              <th
                class="px-6 py-3 text-right font-semibold text-um-muted uppercase tracking-wider text-xs"
              >
                Monto
              </th>
              <th
                class="px-6 py-3 text-center font-semibold text-um-muted uppercase tracking-wider text-xs"
              >
                Estado
              </th>
              <th
                class="px-6 py-3 text-center font-semibold text-um-muted uppercase tracking-wider text-xs"
              >
                Acción
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-um-border">
            @for (oc of service.ordenesCompra(); track oc) {
              <tr class="hover:bg-um-surface transition-colors">
                <td class="px-6 py-4 font-mono font-bold text-um-text">{{ oc.nroOC }}</td>
                <td class="px-6 py-4">
                  <div class="font-medium text-um-ink">{{ oc.proveedorNombre }}</div>
                  <div class="text-xs text-um-muted">{{ oc.observaciones | slice: 0 : 30 }}...</div>
                </td>
                <td class="px-6 py-4 text-right font-bold text-um-ink">
                  {{ oc.montoTotal | currency: 'USD' }}
                </td>
                <td class="px-6 py-4 text-center">
                  <span
                    class="px-2.5 py-1 text-[10px] font-black rounded-full uppercase"
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800':
                        oc.estado === OrdenCompraEstado.PENDIENTE_APROBACION,
                      'bg-green-100 text-green-800': oc.estado === OrdenCompraEstado.APROBADA,
                      'bg-um-selected text-um-primary':
                        oc.estado === OrdenCompraEstado.ENVIADA ||
                        oc.estado === OrdenCompraEstado.CUMPLIDA,
                      'bg-red-100 text-red-800': oc.estado === OrdenCompraEstado.ANULADA,
                    }"
                  >
                    {{ oc.estado.replace('_', ' ') }}
                  </span>
                </td>
                <td class="px-6 py-4 text-center">
                  <button
                    [routerLink]="['/compras/oc', oc.id]"
                    class="text-um-primary hover:text-um-primary font-medium text-xs bg-um-selected px-3 py-1.5 rounded-lg hover:bg-um-selected transition-colors"
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class OcDashboardComponent {
  public service = inject(OrdenCompraService);
  public roles = this.service.getRoles();
  public RolSimulado = RolSimulado;
  public OrdenCompraEstado = OrdenCompraEstado;
}
