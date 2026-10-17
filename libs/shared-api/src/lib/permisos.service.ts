import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { API_URL } from './tokens';
import { AuthService } from './auth.service';

interface PermisoEfectivoResponse {
  userId: number;
  permisos: string[];
}

/**
 * Bundle de permisos efectivos del usuario en sesión. Se carga al iniciar sesión
 * (`GET /permisoEfectivo/usuario/{userId}`) y se limpia al cerrar sesión.
 *
 * Es la base del gating de UX (menú, rutas y directiva `*permiso`). La clave sigue
 * la convención `modulo.accion`. Si el endpoint falla o no hay sesión, el bundle
 * queda vacío (fail-closed): los ítems/acciones que declaren `permiso` no se muestran.
 */
@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly coreUrl = inject(API_URL).replace(/\/auth\/?$/, '');

  private readonly permisos = signal<ReadonlySet<string>>(new Set<string>());
  private readonly cargado = signal(false);

  readonly permisosSignal = this.permisos.asReadonly();
  readonly cargadoSignal = this.cargado.asReadonly();

  constructor() {
    this.auth.currentUser$.subscribe(user => {
      if (user?.userId != null) {
        this.fetch(user.userId).subscribe();
      } else {
        this.permisos.set(new Set<string>());
        this.cargado.set(false);
      }
    });
  }

  hasPermiso(clave: string): boolean {
    return this.permisos().has(clave);
  }

  hasPermisoSignal(clave: string): Signal<boolean> {
    return computed(() => this.permisos().has(clave));
  }

  /** Carga el bundle si aún no se cargó. Pensado para guards (evita decidir antes de tiempo). */
  ensureLoaded(userId: number): Observable<void> {
    if (this.cargado()) {
      return of(void 0);
    }
    return this.fetch(userId);
  }

  /** Fuerza una recarga (p. ej. tras cambiar permisos). */
  recargar(): void {
    const user = this.auth.currentUserValue;
    if (user?.userId != null) {
      this.fetch(user.userId).subscribe();
    }
  }

  private fetch(userId: number): Observable<void> {
    return this.http
      .get<PermisoEfectivoResponse>(`${this.coreUrl}/permisoEfectivo/usuario/${userId}`)
      .pipe(
        tap(resp => {
          this.permisos.set(new Set(resp?.permisos ?? []));
          this.cargado.set(true);
        }),
        map(() => void 0),
        catchError(() => {
          this.permisos.set(new Set<string>());
          this.cargado.set(true);
          return of(void 0);
        }),
      );
  }
}
