import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  FormControl,
  FormsModule,
} from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { mensajeDeError } from '@tesoreria/shared-api';
import {
  BuscadorProveedorComponent,
  BuscadorCuentaContableComponent,
  CuentaSearchResponse,
  PermisoDirective,
  ProveedorSearchResponse,
} from '@tesoreria/ui-layout';
import { catchError, debounceTime, distinctUntilChanged, timeout } from 'rxjs/operators';
import { of, TimeoutError } from 'rxjs';

export interface PaginatedResponse<T> {
  data: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface Articulo {
  articuloId?: number;
  nombre: string;
  descripcion: string;
  unidad: string;
  precio: number;
  inventariable: number;
  stockMinimo: number;
  numeroCuenta: number | null;
  tipo: string;
  directo: number;
  habilitado: number;
  cuenta?: any;
}

export interface Ubicacion {
  ubicacionId: number;
  nombre: string;
  dependenciaId: number;
  geograficaId: number;
}

export type TipoAviso = 'error' | 'warn' | 'success';

/** Límite de espera de cada pedido de la cadena de guardado. */
const LIMITE_GUARDADO_MS = 30_000;
const SIN_CONFIRMAR = 'No se pudo confirmar si el gasto quedó guardado; vuelva a intentar.';

export interface UbicacionArticulo {
  ubicacionArticuloId?: number;
  ubicacionId: number;
  articuloId: number;
  numeroCuenta: number;
  ubicacion?: Ubicacion;
  cuenta?: any;
}

@Component({
  selector: 'app-gastos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    BuscadorCuentaContableComponent,
    BuscadorProveedorComponent,
    PermisoDirective,
    CommonModule,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './gastos.html',
})
export class GastosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly articuloUrl = '/api/tesoreria/compras/articulo';
  private readonly ubicacionUrl = '/api/tesoreria/compras/ubicacion';
  private readonly ubicacionArticuloUrl = '/api/tesoreria/compras/ubicacionArticulo';

  public gastos: Articulo[] = [];
  public filteredGastos: Articulo[] = [];
  public selectedGasto: Articulo | null = null;

  public isLoading = false;
  public errorMessage = '';
  public successMessage = '';

  public isModalOpen = false;
  /** Aviso fijo dentro del modal; error y advertencia no se borran solos. */
  public modalAviso: { tipo: TipoAviso; texto: string } | null = null;
  /** Fase de la cadena de guardado (POST/PUT → GET /articulo/{id} → /new). */
  public estadoGuardado: 'guardando' | 'comprobando' | null = null;
  public isAsignando = false;
  private avisoTimer: ReturnType<typeof setTimeout> | null = null;
  public isBuscadorCuentaOpen = false;

  // Imputaciones State
  public ubicaciones: Ubicacion[] = [];
  public imputaciones: UbicacionArticulo[] = [];
  public isBuscadorCuentaImputacionOpen = false;
  public selectedUbicacionId: number | null = null;
  public selectedImputacionCuenta: { numeroCuenta: number; nombre: string } | null = null;

  public searchQuery = new FormControl('');
  public isSearching = false;

  public currentPage = 0;
  public pageSize = 10;
  public totalPages = 0;

  public gastoForm = this.fb.group({
    articuloId: [{ value: null as number | null, disabled: true }],
    nombre: ['', Validators.required],
    directo: [false],
    // Cuenta opcional, como en frmGasto de VB6 (sin cuenta se guarda null).
    numeroCuenta: [null as number | null],
    nombreCuenta: [{ value: '', disabled: true }],
  });

  ngOnInit() {
    this.loadGastos(0);
    this.loadUbicaciones();

    this.searchQuery.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((query) => {
        this.zone.run(() => {
          const q = (query || '').trim();
          if (q.length > 0) {
            this.buscarGastos(q);
          } else {
            this.loadGastos(0);
          }
        });
      });
  }

  loadGastos(page = 0) {
    this.isLoading = true;
    this.isSearching = false;
    this.http
      .post<PaginatedResponse<Articulo>>(`${this.articuloUrl}/tipo/gasto/page`, {
        page,
        size: this.pageSize,
      })
      .pipe(
        catchError((err) => {
          console.error('Error al cargar la lista de gastos.', err);
          this.showError(
            err?.status === 403
              ? 'No tiene permiso para ver los gastos.'
              : 'Error de conexión con el servidor.',
          );
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.zone.run(() => {
          if (response) {
            this.gastos = response.data || [];
            this.filteredGastos = [...this.gastos];
            this.currentPage = response.currentPage;
            this.totalPages = response.totalPages;
          } else {
            this.gastos = [];
            this.filteredGastos = [];
          }
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  loadUbicaciones() {
    this.http.get<Ubicacion[]>(`${this.ubicacionUrl}/`).subscribe((data) => {
      this.ubicaciones = data || [];
      this.cdr.detectChanges();
    });
  }

  loadImputaciones(articuloId: number) {
    this.http
      .get<UbicacionArticulo[]>(`${this.ubicacionArticuloUrl}/articulo/${articuloId}`)
      .subscribe((data) => {
        this.imputaciones = data || [];
        this.cdr.detectChanges();
      });
  }

  buscarGastos(query: string) {
    this.isLoading = true;
    this.isSearching = true;
    this.cdr.detectChanges();
    const conditions = query
      .trim()
      .split(/\s+/)
      .filter((c) => c.length > 0);
    this.http
      .post<any[]>(`${this.articuloUrl}/search`, conditions)
      .pipe(
        catchError((err) => {
          this.showError('Error al realizar la búsqueda.');
          return of([]);
        }),
      )
      .subscribe((data) => {
        this.zone.run(() => {
          // La respuesta del backend ya trae 'numeroCuenta' y el objeto 'cuenta' hidratado correctamente.
          this.gastos = data.filter((a) => (a.tipo || '').toLowerCase() === 'gasto');
          this.filteredGastos = [...this.gastos];
          this.currentPage = 0;
          this.totalPages = 1;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      });
  }

  limpiarBusqueda() {
    this.searchQuery.setValue('', { emitEvent: false });
    this.loadGastos(0);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1 && !this.isSearching)
      this.loadGastos(this.currentPage + 1);
  }

  prevPage() {
    if (this.currentPage > 0 && !this.isSearching) this.loadGastos(this.currentPage - 1);
  }

  abrirBuscadorCuenta() {
    this.zone.run(() => {
      this.isBuscadorCuentaOpen = true;
      this.cdr.detectChanges();
    });
  }

  onCuentaSelected(cuenta: CuentaSearchResponse) {
    this.zone.run(() => {
      this.gastoForm.patchValue({ numeroCuenta: cuenta.numeroCuenta, nombreCuenta: cuenta.nombre });
      this.isBuscadorCuentaOpen = false;
      this.cdr.detectChanges();
    });
  }

  cerrarBuscadorCuenta() {
    this.zone.run(() => {
      this.isBuscadorCuentaOpen = false;
      this.cdr.detectChanges();
    });
  }

  // Imputaciones methods
  abrirBuscadorCuentaImputacion() {
    this.zone.run(() => {
      this.isBuscadorCuentaImputacionOpen = true;
      this.cdr.detectChanges();
    });
  }

  onCuentaImputacionSelected(cuenta: CuentaSearchResponse) {
    this.zone.run(() => {
      this.selectedImputacionCuenta = { numeroCuenta: cuenta.numeroCuenta, nombre: cuenta.nombre };
      this.isBuscadorCuentaImputacionOpen = false;
      this.cdr.detectChanges();
    });
  }

  asignarUbicacion() {
    if (!this.selectedGasto?.articuloId) {
      this.avisar('error', 'Guarde el gasto antes de asignarle ubicaciones.');
      return;
    }
    if (!this.selectedUbicacionId || !this.selectedImputacionCuenta) {
      this.avisar('error', 'Seleccione ubicación y cuenta para asignar.');
      return;
    }

    const payload = {
      ubicacionId: Number(this.selectedUbicacionId),
      articuloId: this.selectedGasto.articuloId,
      numeroCuenta: this.selectedImputacionCuenta.numeroCuenta,
    };

    this.isAsignando = true;
    this.cdr.detectChanges();

    this.http.post<UbicacionArticulo>(`${this.ubicacionArticuloUrl}/`, payload).subscribe({
      next: () => {
        this.zone.run(() => {
          this.isAsignando = false;
          this.selectedImputacionCuenta = null;
          this.loadImputaciones(payload.articuloId);
          this.avisar('success', 'Ubicación asignada.');
        });
      },
      error: (err) => {
        this.zone.run(() => {
          this.isAsignando = false;
          this.avisar('error', mensajeDeError(err, 'Error al asignar la ubicación.'));
        });
      },
    });
  }

  abrirModal(gasto?: Articulo) {
    this.zone.run(() => {
      this.errorMessage = '';
      this.successMessage = '';
      this.limpiarAvisoModal();
      this.imputaciones = [];
      this.selectedImputacionCuenta = null;
      this.selectedUbicacionId = null;

      if (gasto) {
        this.selectedGasto = gasto;
        this.gastoForm.patchValue({
          articuloId: gasto.articuloId,
          nombre: gasto.nombre,
          directo: gasto.directo === 1,
          numeroCuenta: gasto.numeroCuenta,
          nombreCuenta: gasto.cuenta ? gasto.cuenta.nombre : '',
        });
        if (gasto.articuloId) this.loadImputaciones(gasto.articuloId);
        this.isModalOpen = true;
        this.cdr.detectChanges();
      } else {
        this.selectedGasto = null;
        this.gastoForm.reset({ directo: false });
        this.isLoading = true;
        this.http.get<Articulo>(`${this.articuloUrl}/new`).subscribe({
          next: (newArticulo) => {
            this.zone.run(() => {
              this.gastoForm.patchValue({ articuloId: newArticulo.articuloId });
              this.isLoading = false;
              this.isModalOpen = true;
              this.cdr.detectChanges();
            });
          },
          error: () => {
            this.zone.run(() => {
              this.isLoading = false;
              this.showError('No se pudo inicializar un nuevo Gasto.');
            });
          },
        });
      }
    });
  }

  get isSaving(): boolean {
    return this.estadoGuardado !== null;
  }

  cerrarModal() {
    // Con un guardado en curso el modal no se cierra (fondo, Esc, cruz ni Cancelar): una respuesta
    // tardía no debe tocar otro formulario.
    if (this.isSaving) return;
    this.zone.run(() => {
      this.isModalOpen = false;
      this.selectedGasto = null;
      this.limpiarAvisoModal();
      this.gastoForm.reset();
      this.cdr.detectChanges();
    });
  }

  guardar() {
    if (this.isSaving) return;
    this.limpiarAvisoModal();
    const formValue = this.gastoForm.getRawValue();
    const nombre = (formValue.nombre || '').trim();
    // frmGasto de VB6: "ERROR: Falta NOMBRE" (también con sólo espacios).
    if (!nombre) {
      this.gastoForm.get('nombre')?.markAsTouched();
      this.avisar('error', 'Falta el nombre del gasto.');
      return;
    }
    const numeroCuenta = formValue.numeroCuenta ? Number(formValue.numeroCuenta) : null;
    const directo = formValue.directo ? 1 : 0;
    const articuloId = formValue.articuloId;
    const esEdicion = !!(articuloId && this.selectedGasto);

    // El PUT no puede vaciar la cuenta (nulo = sin cambios): se avisa en vez de mostrar «guardado».
    if (esEdicion && this.selectedGasto?.numeroCuenta && numeroCuenta === null) {
      this.avisar('error', 'La cuenta no se puede quitar; elija otra o deje la actual.');
      return;
    }

    // Core (8.0.0+) aplica el PUT por fusión: un campo ausente o nulo no cambia, pero un 0 o ''
    // explícito sí. Por eso la edición manda sólo lo que muestra la pantalla; mandar el artículo
    // completo pisaría precio, unidad, habilitado, etc.
    const request$ = esEdicion
      ? this.http.put<Articulo>(`${this.articuloUrl}/${articuloId}`, {
          nombre,
          numeroCuenta,
          directo,
          tipo: 'gasto',
        })
      : this.http.post<Articulo>(`${this.articuloUrl}/`, {
          articuloId: articuloId ?? undefined,
          nombre,
          numeroCuenta,
          directo,
          tipo: 'gasto',
          descripcion: '',
          unidad: '',
          precio: 0,
          inventariable: 0,
          stockMinimo: 0,
          habilitado: 1,
        } satisfies Articulo);

    this.estadoGuardado = 'guardando';
    this.cdr.detectChanges();
    request$.pipe(timeout(LIMITE_GUARDADO_MS)).subscribe({
      next: (guardado) => {
        this.zone.run(() => {
          const id = guardado?.articuloId ?? articuloId;
          this.terminarGuardado(`Gasto N.º ${id} «${nombre}» guardado.`);
        });
      },
      error: (err) => {
        this.zone.run(() => {
          if (!esEdicion && err instanceof HttpErrorResponse && err.status === 409) {
            this.comprobarAlta(articuloId, { nombre, numeroCuenta, directo });
            return;
          }
          this.estadoGuardado = null;
          if (err instanceof TimeoutError) {
            // En el alta no se sabe si quedó: se conserva el número y el próximo Guardar repite
            // el POST (y, si da 409, la comprobación).
            if (esEdicion) this.avisar('error', 'El servidor no respondió; vuelva a intentar.');
            else this.avisar('warn', SIN_CONFIRMAR);
          } else {
            this.avisar('error', mensajeDeError(err, 'Error al guardar el gasto.'));
          }
        });
      },
    });
  }

  /**
   * 409 en el alta: el número ya existe. Puede ser el mismo gasto, guardado por un intento anterior
   * cuya respuesta se perdió (guía de core, «resultado incierto»). Se lee `GET /articulo/{id}`:
   * si coincide con lo enviado, el alta ya estaba hecha; si no, otro gasto tomó el número.
   */
  private comprobarAlta(
    id: number | null,
    enviado: { nombre: string; numeroCuenta: number | null; directo: number },
  ) {
    this.estadoGuardado = 'comprobando';
    this.cdr.detectChanges();
    this.http
      .get<Articulo>(`${this.articuloUrl}/${id}`)
      .pipe(timeout(LIMITE_GUARDADO_MS))
      .subscribe({
        next: (actual) => {
          this.zone.run(() => {
            const coincide =
              (actual?.nombre ?? '').trim() === enviado.nombre &&
              (actual?.tipo ?? '').toLowerCase() === 'gasto' &&
              (actual?.numeroCuenta ?? null) === enviado.numeroCuenta &&
              actual?.directo === enviado.directo;
            if (coincide) this.terminarGuardado(`El gasto N.º ${id} ya estaba guardado.`);
            else this.renovarIdAlta(id);
          });
        },
        // «No se pudo leer» no significa «es otro gasto»: se conserva el número para no duplicar.
        error: () => {
          this.zone.run(() => {
            this.estadoGuardado = null;
            this.avisar('warn', SIN_CONFIRMAR);
          });
        },
      });
  }

  /**
   * Otro gasto ya usa el número. Como `cleanForm` de VB6, se pide uno nuevo con `/new`;
   * se conservan los datos cargados para volver a guardar.
   */
  private renovarIdAlta(idAnterior: number | null) {
    this.http
      .get<Articulo>(`${this.articuloUrl}/new`)
      .pipe(timeout(LIMITE_GUARDADO_MS))
      .subscribe({
        next: (nuevo) => {
          this.zone.run(() => {
            this.estadoGuardado = null;
            this.gastoForm.patchValue({ articuloId: nuevo.articuloId });
            this.avisar(
              'warn',
              `El número ${idAnterior} ya lo usa otro gasto. Se asignó el ${nuevo.articuloId}; revise los datos y vuelva a guardar.`,
            );
          });
        },
        error: () => {
          this.zone.run(() => {
            this.estadoGuardado = null;
            this.avisar('error', 'El número ya lo usa otro gasto y no se pudo obtener uno nuevo.');
          });
        },
      });
  }

  private terminarGuardado(mensaje: string) {
    this.estadoGuardado = null;
    this.cerrarModal();
    this.showSuccess(mensaje);
    this.loadGastos(0);
  }

  eliminar(gasto: Articulo) {
    if (!gasto || !gasto.articuloId) return;
    if (confirm('¿Está seguro de eliminar permanentemente el gasto?')) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.http.delete(`${this.articuloUrl}/${gasto.articuloId}`).subscribe({
        next: () => {
          this.zone.run(() => {
            this.showSuccess('Gasto eliminado.');
            this.loadGastos(0);
          });
        },
        // 409: el gasto está usado en entregas o facturas; core no borra nada.
        error: (err) => {
          this.zone.run(() => {
            this.showError(mensajeDeError(err, 'Error al eliminar el gasto.'));
            this.isLoading = false;
          });
        },
      });
    }
  }

  /** Con el modal abierto el aviso va dentro del modal; si no, arriba de la página. */
  private avisar(tipo: TipoAviso, texto: string) {
    if (!this.isModalOpen) {
      if (tipo === 'success') this.showSuccess(texto);
      else this.showError(texto);
      this.cdr.detectChanges();
      return;
    }
    this.limpiarAvisoModal();
    const aviso = { tipo, texto };
    this.modalAviso = aviso;
    if (tipo === 'success') {
      this.avisoTimer = setTimeout(() => {
        this.zone.run(() => {
          if (this.modalAviso === aviso) this.modalAviso = null;
          this.cdr.detectChanges();
        });
      }, 5000);
    }
    this.cdr.detectChanges();
  }

  private limpiarAvisoModal() {
    if (this.avisoTimer) clearTimeout(this.avisoTimer);
    this.avisoTimer = null;
    this.modalAviso = null;
  }

  private showError(msg: string) {
    this.errorMessage = msg;
    // Zoneless: sin esto el aviso espera al próximo ciclo y puede borrarse antes de verse.
    this.cdr.detectChanges();
    setTimeout(() => {
      this.zone.run(() => {
        this.errorMessage = '';
        this.cdr.detectChanges();
      });
    }, 5000);
  }

  private showSuccess(msg: string) {
    this.successMessage = msg;
    // Zoneless: sin esto el aviso espera al próximo ciclo y puede borrarse antes de verse.
    this.cdr.detectChanges();
    setTimeout(() => {
      this.zone.run(() => {
        this.successMessage = '';
        this.cdr.detectChanges();
      });
    }, 3000);
  }
}
