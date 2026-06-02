import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { OrdenCompra, OrdenCompraEstado, RolSimulado, Comentario } from '../models/orden-compra.models';

@Injectable({ providedIn: 'root' })
export class OrdenCompraService {
  public currentRol = signal<RolSimulado>(RolSimulado.DIR_COMPRAS);
  private _ordenesCompra = signal<OrdenCompra[]>([]);
  public ordenesCompra = computed(() => this._ordenesCompra());

  constructor() {
    this._ordenesCompra.set([
      {
        id: 1,
        nroOC: 'OC-2026-001',
        fecha: new Date().toISOString(),
        proveedorId: 101,
        proveedorNombre: 'TecnoGlobal S.A.',
        controlCantidad: true,
        controlImporte: true,
        articulos: [{ descripcion: 'Monitor Dell 24"', cantidad: 2, unidadMedida: 'Un.', precioUnitario: 22500, subtotal: 45000, inventariable: true }],
        refPresupuesto: 'P-1014',
        plazoEntrega: '15 días hábiles',
        condicionPago: 'TRANSFERENCIA',
        descuentoGlobal: 0,
        montoTotal: 45000, 
        saldoPendiente: 45000,
        estado: OrdenCompraEstado.PENDIENTE_APROBACION,
        observaciones: 'Renovación oficina técnica',
        historial: [{ id: 1, usuario: RolSimulado.DIR_COMPRAS, fecha: new Date().toISOString(), texto: 'Presupuesto Inicial', isAdjunto: true, adjuntoNombre: 'presupuesto_tecno.pdf', tipoAdjunto: 'PRESUPUESTO', isSeleccionado: true }]
      }
    ]);
  }

  getRoles(): RolSimulado[] { return Object.values(RolSimulado); }
  setRol(rol: RolSimulado) { this.currentRol.set(rol); }

  getOrdenById(id: number): Observable<OrdenCompra | undefined> {
    const oc = this._ordenesCompra().find(o => o.id === id);
    return of(oc).pipe(delay(200));
  }

  createOrdenCompra(oc: Partial<OrdenCompra>): Observable<OrdenCompra> {
    const subtotalArticulos = oc.articulos?.reduce((sum, art) => sum + art.subtotal, 0) || 0;
    const desc = oc.descuentoGlobal || 0;
    const total = Math.max(0, subtotalArticulos - desc);

    const newOC: OrdenCompra = {
      id: Math.floor(Math.random() * 1000) + 100,
      nroOC: 'OC-2026-' + String(this._ordenesCompra().length + 1).padStart(3, '0'),
      fecha: new Date().toISOString(),
      proveedorId: oc.proveedorId || 0,
      proveedorNombre: oc.proveedorNombre || 'Proveedor Desconocido',
      controlCantidad: oc.controlCantidad || false,
      controlImporte: oc.controlImporte || false,
      articulos: oc.articulos || [],
      
      refPresupuesto: oc.refPresupuesto,
      plazoEntrega: oc.plazoEntrega,
      condicionPago: oc.condicionPago || 'TRANSFERENCIA',
      descuentoGlobal: desc,
      nroFacturaAsociada: oc.nroFacturaAsociada,

      montoTotal: total,
      saldoPendiente: total,
      estado: OrdenCompraEstado.PENDIENTE_APROBACION,
      observaciones: oc.observaciones || '',
      historial: oc.historial || [],
      centroCostoId: oc.centroCostoId,
      centroCostoNombre: oc.centroCostoNombre
    };
    this._ordenesCompra.update(prev => [newOC, ...prev]);
    return of(newOC).pipe(delay(300));
  }

  addMensaje(ocId: number, texto: string, isAdjunto = false, adjuntoNombre?: string): Observable<boolean> {
    this._ordenesCompra.update(prev => prev.map(oc => {
      if (oc.id === ocId) {
        const msg: Comentario = { id: Date.now(), usuario: this.currentRol(), fecha: new Date().toISOString(), texto, isAdjunto, adjuntoNombre };
        return { ...oc, historial: [...oc.historial, msg] };
      }
      return oc;
    }));
    return of(true).pipe(delay(200));
  }

  aprobarOrdenCompra(id: number): Observable<boolean> {
    const oc = this._ordenesCompra().find(o => o.id === id);
    if (!oc) return of(false);
    const rol = this.currentRol();
    let canApprove = false;
    if (oc.montoTotal <= 50000 && rol === RolSimulado.DIR_ADMINISTRACION) canApprove = true;
    if (oc.montoTotal > 50000 && oc.montoTotal <= 200000 && (rol === RolSimulado.SEC_ADMINISTRATIVO || rol === RolSimulado.DIR_GESTION)) canApprove = true;
    if (oc.montoTotal > 200000 && rol === RolSimulado.RECTOR) canApprove = true;
    if (!canApprove) { alert('No tiene permisos para aprobar por este monto.'); return of(false); }
    this._ordenesCompra.update(prev => prev.map(o => o.id === id ? { ...o, estado: OrdenCompraEstado.APROBADA, aprobadaPor: rol, historial: [...o.historial, { id: Date.now(), usuario: rol, fecha: new Date().toISOString(), texto: 'ORDEN APROBADA.' }] } : o));
    return of(true).pipe(delay(300));
  }

  enviarOrdenCompra(id: number): Observable<boolean> {
    this._ordenesCompra.update(prev => prev.map(o => o.id === id ? { ...o, estado: OrdenCompraEstado.ENVIADA, historial: [...o.historial, { id: Date.now(), usuario: this.currentRol(), fecha: new Date().toISOString(), texto: 'OC enviada al proveedor.' }] } : o));
    return of(true).pipe(delay(200));
  }

  anularOrdenCompra(id: number, esTotal: boolean): Observable<boolean> {
    this._ordenesCompra.update(prev => prev.map(o => {
      if (o.id === id) {
        const nuevoEstado = esTotal ? OrdenCompraEstado.ANULADA : OrdenCompraEstado.CUMPLIDA_PARCIAL;
        return { ...o, estado: nuevoEstado, saldoPendiente: 0, historial: [...o.historial, { id: Date.now(), usuario: this.currentRol(), fecha: new Date().toISOString(), texto: 'Anulada.' }] };
      }
      return o;
    }));
    return of(true).pipe(delay(200));
  }

  getCentrosCosto(): Observable<any[]> {
    return of([{ id: 1, nombre: 'Sistemas' }, { id: 2, nombre: 'Mantenimiento' }, { id: 3, nombre: 'Rectorado' }]).pipe(delay(200));
  }
}
