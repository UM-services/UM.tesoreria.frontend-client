import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrdenCompraService } from '../data-access/orden-compra.service';
import { OrdenCompra, OrdenCompraEstado, RolSimulado } from '../models/orden-compra.models';

@Component({
  selector: 'tesoreria-oc-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    @if (oc()) {
      <div class="max-w-5xl mx-auto p-6 space-y-6">
        <!-- HEADER & ACTIONS -->
        <div
          class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-um-border shadow-sm"
        >
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h1 class="text-2xl font-black text-um-ink">{{ oc()?.nroOC }}</h1>
              <span
                class="px-2.5 py-1 text-[10px] font-black rounded-full uppercase bg-um-surface text-um-ink"
                >{{ oc()?.estado?.replace('_', ' ') }}</span
              >
            </div>
            <p class="text-sm text-um-muted font-medium">
              {{ oc()?.proveedorNombre }} - Monto:
              <span class="text-um-ink font-bold">{{ oc()?.montoTotal | currency: 'USD' }}</span>
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            @if (oc()?.estado === OrdenCompraEstado.PENDIENTE_APROBACION) {
              <button
                (click)="aprobar()"
                class="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-sm text-sm"
              >
                Aprobar OC
              </button>
            }
            @if (oc()?.estado === OrdenCompraEstado.APROBADA && rol() === RolSimulado.DIR_COMPRAS) {
              <button
                (click)="enviar()"
                class="px-4 py-2 bg-um-primary text-white font-bold rounded-lg hover:bg-um-primary-hover shadow-sm text-sm"
              >
                Enviar al Proveedor
              </button>
            }
            @if (
              rol() === RolSimulado.DIR_ADMINISTRACION && oc()?.estado !== OrdenCompraEstado.ANULADA
            ) {
              <button
                (click)="anular()"
                class="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg hover:bg-red-200 border border-red-200 shadow-sm text-sm"
              >
                Anular (Total/Parcial)
              </button>
            }
            <button
              routerLink="/compras"
              class="px-4 py-2 bg-white text-um-text font-bold rounded-lg border border-um-border-strong hover:bg-um-surface shadow-sm text-sm"
            >
              Volver
            </button>
          </div>
        </div>

        <!-- TIMELINE / CHAT (1.d) -->
        <div
          class="bg-white rounded-xl border border-um-border shadow-sm overflow-hidden flex flex-col h-[500px]"
        >
          <div
            class="bg-um-surface px-4 py-3 border-b border-um-border flex justify-between items-center"
          >
            <h3 class="font-bold text-um-text text-sm">Historial de Tramitación y Adjuntos</h3>
            <span class="text-xs text-um-muted font-medium">Actuando como: {{ rol() }}</span>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-um-surface/50">
            @for (msg of oc()?.historial; track msg) {
              <div
                class="flex flex-col gap-1"
                [ngClass]="msg.usuario === rol() ? 'items-end' : 'items-start'"
              >
                <span class="text-[10px] font-bold text-um-muted px-1"
                  >{{ msg.usuario }} - {{ msg.fecha | date: 'short' }}</span
                >

                <!-- Mensaje Texto -->
                @if (!msg.isAdjunto) {
                  <div
                    class="px-4 py-2.5 rounded-2xl max-w-[80%] shadow-sm text-sm"
                    [ngClass]="
                      msg.usuario === rol()
                        ? 'bg-um-primary text-white rounded-tr-none'
                        : 'bg-white border border-um-border text-um-ink rounded-tl-none'
                    "
                  >
                    {{ msg.texto }}
                  </div>
                }

                <!-- Archivo Adjunto -->
                @if (msg.isAdjunto) {
                  <div
                    class="px-4 py-3 rounded-2xl max-w-[80%] shadow-sm border border-um-border flex items-center gap-3 bg-white"
                    [ngClass]="msg.usuario === rol() ? 'rounded-tr-none' : 'rounded-tl-none'"
                  >
                    <div class="p-2 bg-red-100 text-red-600 rounded-lg">PDF</div>
                    <div class="flex flex-col">
                      <span class="text-sm font-bold text-um-ink">{{ msg.adjuntoNombre }}</span>
                      <span class="text-xs text-um-muted">{{ msg.texto }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Input Area -->
          <div class="p-3 bg-white border-t border-um-border">
            <div class="flex gap-2 relative">
              <button
                (click)="simularAdjunto()"
                class="p-2.5 text-um-muted hover:text-um-primary hover:bg-um-selected rounded-lg transition-colors"
                title="Simular Adjuntar PDF"
              >
                [ + PDF ]
              </button>
              <input
                type="text"
                [(ngModel)]="nuevoMensaje"
                (keyup.enter)="enviarMensaje()"
                placeholder="Escriba un comentario sobre la orden..."
                class="flex-1 bg-um-surface border border-um-border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-um-primary focus:border-um-primary outline-none transition-all"
              />
              <button
                (click)="enviarMensaje()"
                [disabled]="!nuevoMensaje.trim()"
                class="bg-um-primary text-white px-4 rounded-xl font-bold hover:bg-um-primary-hover disabled:bg-um-border-strong transition-colors"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class OcDetailComponent implements OnInit {
  public service = inject(OrdenCompraService);
  private route = inject(ActivatedRoute);

  public RolSimulado = RolSimulado;
  public OrdenCompraEstado = OrdenCompraEstado;

  public oc = signal<OrdenCompra | undefined>(undefined);
  public rol = this.service.currentRol;
  public nuevoMensaje = '';

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) this.loadOC(id);
    });
  }

  loadOC(id: number) {
    this.service.getOrdenById(id).subscribe((data) => this.oc.set(data));
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || !this.oc()) return;
    this.service.addMensaje(this.oc()!.id, this.nuevoMensaje).subscribe(() => {
      this.nuevoMensaje = '';
      this.loadOC(this.oc()!.id);
    });
  }

  simularAdjunto() {
    const filename = prompt(
      'Nombre del archivo a simular (ej. cotizacion.pdf):',
      'presupuesto.pdf',
    );
    if (!filename || !this.oc()) return;
    this.service.addMensaje(this.oc()!.id, 'Documento adjuntado.', true, filename).subscribe(() => {
      this.loadOC(this.oc()!.id);
    });
  }

  aprobar() {
    if (!this.oc()) return;
    this.service.aprobarOrdenCompra(this.oc()!.id).subscribe((success) => {
      if (success) this.loadOC(this.oc()!.id);
    });
  }

  enviar() {
    if (!this.oc()) return;
    this.service.enviarOrdenCompra(this.oc()!.id).subscribe((success) => {
      if (success) this.loadOC(this.oc()!.id);
    });
  }

  anular() {
    if (!this.oc()) return;
    const esTotal = confirm(
      '¿Desea anular TOTALMENTE la orden de compra? (Cancelar = Anulación Parcial / Saldo)',
    );
    this.service.anularOrdenCompra(this.oc()!.id, esTotal).subscribe((success) => {
      if (success) this.loadOC(this.oc()!.id);
    });
  }
}
