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
      <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-200 flex justify-between items-center shadow-sm">
        <div>
          <h3 class="font-bold text-indigo-900">Simulador de Roles (Testing)</h3>
          <p class="text-xs text-indigo-700">Cambie el rol para habilitar distintas acciones (Aprobar, Anular, Crear).</p>
        </div>
        <select [ngModel]="service.currentRol()" (ngModelChange)="service.setRol($event)" class="font-medium text-sm border-indigo-300 rounded-lg shadow-sm text-indigo-900 bg-white">
          <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
        </select>
      </div>

      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Órdenes de Compra</h1>
          <p class="text-sm text-gray-500">Gestión, seguimiento y aprobación de adquisiciones.</p>
        </div>
        <button *ngIf="service.currentRol() === RolSimulado.DIR_COMPRAS" 
                routerLink="nueva"
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors">
          + Nueva Orden
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Nro OC</th>
              <th class="px-6 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Proveedor</th>
              <th class="px-6 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Monto</th>
              <th class="px-6 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Estado</th>
              <th class="px-6 py-3 text-center font-semibold text-gray-500 uppercase tracking-wider text-xs">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr *ngFor="let oc of service.ordenesCompra()" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 font-mono font-bold text-gray-700">{{ oc.nroOC }}</td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900">{{ oc.proveedorNombre }}</div>
                <div class="text-xs text-gray-500">{{ oc.observaciones | slice:0:30 }}...</div>
              </td>
              <td class="px-6 py-4 text-right font-bold text-gray-900">{{ oc.montoTotal | currency:'USD' }}</td>
              <td class="px-6 py-4 text-center">
                <span class="px-2.5 py-1 text-[10px] font-black rounded-full uppercase"
                      [ngClass]="{
                        'bg-yellow-100 text-yellow-800': oc.estado === OrdenCompraEstado.PENDIENTE_APROBACION,
                        'bg-green-100 text-green-800': oc.estado === OrdenCompraEstado.APROBADA,
                        'bg-blue-100 text-blue-800': oc.estado === OrdenCompraEstado.ENVIADA || oc.estado === OrdenCompraEstado.CUMPLIDA,
                        'bg-red-100 text-red-800': oc.estado === OrdenCompraEstado.ANULADA
                      }">
                  {{ oc.estado.replace('_', ' ') }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <button [routerLink]="['/compras/oc', oc.id]" class="text-blue-600 hover:text-blue-900 font-medium text-xs bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                  Ver Detalle
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class OcDashboardComponent {
  public service = inject(OrdenCompraService);
  public roles = this.service.getRoles();
  public RolSimulado = RolSimulado;
  public OrdenCompraEstado = OrdenCompraEstado;

  
}
