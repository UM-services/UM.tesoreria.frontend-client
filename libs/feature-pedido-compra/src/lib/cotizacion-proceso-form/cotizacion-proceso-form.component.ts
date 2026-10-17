import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BuscadorProveedorComponent, ProveedorSearchResponse } from '@tesoreria/ui-layout';
import { CotizacionProcesoService } from '../data-access/cotizacion-proceso.service';
import { CotizacionPendiente, CotizacionProcesoRequest } from '../models/cotizacion-proceso.models';

interface Grupo {
  compraPedidoId: number;
  numero: string;
  items: CotizacionPendiente[];
}

interface ProveedorElegido {
  proveedorId: number;
  razonSocial: string;
  email: string | null;
}

@Component({
  selector: 'app-cotizacion-proceso-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorProveedorComponent],
  templateUrl: './cotizacion-proceso-form.component.html',
})
export class CotizacionProcesoFormComponent implements OnInit {
  private readonly cotizacionProcesoService = inject(CotizacionProcesoService);
  private readonly router = inject(Router);

  readonly pendientes = signal<CotizacionPendiente[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set<number>());
  readonly proveedores = signal<ProveedorElegido[]>([]);
  readonly isLoading = signal(false);
  readonly guardando = signal(false);
  readonly errorMessage = signal('');

  observacion = '';
  excepcionMotivo = '';

  readonly grupos = computed<Grupo[]>(() => {
    const map = new Map<number, Grupo>();
    for (const p of this.pendientes()) {
      const grupo = map.get(p.compraPedidoId) ?? { compraPedidoId: p.compraPedidoId, numero: p.pedidoNumero ?? '', items: [] };
      grupo.items.push(p);
      map.set(p.compraPedidoId, grupo);
    }
    return Array.from(map.values());
  });

  ngOnInit(): void {
    this.cargarPendientes();
  }

  cargarPendientes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.pendientes().subscribe({
      next: (items) => {
        this.pendientes.set(items ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los ítems disponibles.');
        this.isLoading.set(false);
      },
    });
  }

  estaSeleccionado(compraPedidoItemId: number): boolean {
    return this.seleccionados().has(compraPedidoItemId);
  }

  toggle(compraPedidoItemId: number): void {
    const set = new Set(this.seleccionados());
    if (set.has(compraPedidoItemId)) {
      set.delete(compraPedidoItemId);
    } else {
      set.add(compraPedidoItemId);
    }
    this.seleccionados.set(set);
  }

  pedidoCompleto(grupo: Grupo): boolean {
    return grupo.items.every((i) => this.seleccionados().has(i.compraPedidoItemId));
  }

  togglePedido(grupo: Grupo): void {
    const set = new Set(this.seleccionados());
    const completo = this.pedidoCompleto(grupo);
    grupo.items.forEach((i) => (completo ? set.delete(i.compraPedidoItemId) : set.add(i.compraPedidoItemId)));
    this.seleccionados.set(set);
  }

  agregarProveedor(proveedor: ProveedorSearchResponse): void {
    if (this.proveedores().some((p) => p.proveedorId === proveedor.proveedorId)) {
      return;
    }
    this.proveedores.set([
      ...this.proveedores(),
      { proveedorId: proveedor.proveedorId, razonSocial: proveedor.razonSocial, email: null },
    ]);
  }

  quitarProveedor(proveedorId: number): void {
    this.proveedores.set(this.proveedores().filter((p) => p.proveedorId !== proveedorId));
  }

  private construirRequest(): CotizacionProcesoRequest {
    const items = this.pendientes()
      .filter((p) => this.seleccionados().has(p.compraPedidoItemId))
      .map((p) => ({ compraPedidoItemId: p.compraPedidoItemId, orden: p.orden, cantidad: p.cantidad }));
    return {
      observacion: this.observacion || null,
      fechaLimiteRespuesta: null,
      excepcionMotivo: this.excepcionMotivo || null,
      items,
      proveedores: this.proveedores().map((p) => ({ proveedorId: p.proveedorId, email: p.email, observacion: null })),
    };
  }

  guardar(enviar: boolean): void {
    if (this.seleccionados().size === 0) {
      this.errorMessage.set('Seleccioná al menos un ítem de pedido.');
      return;
    }
    if (this.proveedores().length === 0) {
      this.errorMessage.set('Agregá al menos un proveedor.');
      return;
    }
    this.guardando.set(true);
    this.errorMessage.set('');
    this.cotizacionProcesoService.crear(this.construirRequest()).subscribe({
      next: (proceso) => {
        const id = proceso.compraCotizacionId;
        if (id == null) {
          this.fallar();
          return;
        }
        if (enviar) {
          this.cotizacionProcesoService.enviar(id).subscribe({
            next: () => this.router.navigate(['/cotizacion', id]),
            error: () => this.fallar('No se pudo enviar el proceso (revisá el mínimo de cotizaciones).'),
          });
        } else {
          this.router.navigate(['/cotizacion', id]);
        }
      },
      error: () => this.fallar(),
    });
  }

  cancelar(): void {
    this.router.navigate(['/cotizacion']);
  }

  private fallar(mensaje = 'No se pudo guardar el proceso de cotización.'): void {
    this.guardando.set(false);
    this.errorMessage.set(mensaje);
  }
}
