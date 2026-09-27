import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, finalize, shareReplay, tap } from 'rxjs';
import { LoginRequest, LoginResponse, ChangePasswordRequest } from './auth.models';
import { API_URL } from './tokens';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  private readonly currentUserSubject = new BehaviorSubject<LoginResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private pendingUserRequest$: Observable<LoginResponse> | null = null;
  private pendingUserId: number | null = null;

  public readonly currentUserSignal = signal<LoginResponse | null>(null);
  public readonly isLoggedInSignal = computed(() => !!this.currentUserSignal());

  constructor() {
    // Basic session hydration from local storage
    const storedUser = this.storage?.getItem('currentUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        this.currentUserSubject.next(parsed);
        this.currentUserSignal.set(parsed);
        if (parsed.userId) {
          // El localStorage es editable por el usuario: la sesión se revalida
          // siempre contra /me/:userId y los flags de acceso (administrador,
          // usuarioExterno, ...) quedan determinados por el backend.
          this.getUser(parsed.userId).subscribe({ error: () => undefined });
        }
      } catch (e) {
        console.error('Failed to parse stored user', e);
        this.storage?.removeItem('currentUser');
      }
    }
  }

  private get storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  public get currentUserValue(): LoginResponse | null {
    return this.currentUserSubject.value;
  }

  public getUser(userId: number): Observable<LoginResponse> {
    // Reutiliza la solicitud en curso: el constructor, el post-login y las
    // guards de acceso deciden con una sola llamada a /me/:userId.
    if (this.pendingUserRequest$ && this.pendingUserId === userId) {
      return this.pendingUserRequest$;
    }
    const request$ = this.http
      .get<LoginResponse>(`${this.apiUrl}/me/${userId}`)
      .pipe(
        tap((fullUser) => {
          if (fullUser && (fullUser.login != null || fullUser.userId != null)) {
            // /me no es emisor de tokens: algunos entornos devuelven un JWT de
            // placeholder que invalidaría la sesión. El token real sólo lo fija
            // el flujo de login/changePassword.
            const { token: _omitToken, ...profile } = fullUser;
            const current = this.currentUserValue;
            const merged: LoginResponse = current
              ? { ...current, ...profile }
              : fullUser;
            this.storage?.setItem('currentUser', JSON.stringify(merged));
            this.currentUserSubject.next(merged);
            this.currentUserSignal.set(merged);
          }
        }),
        finalize(() => {
          this.pendingUserRequest$ = null;
          this.pendingUserId = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.pendingUserRequest$ = request$;
    this.pendingUserId = userId;
    return request$;
  }

  public login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        if (response && response.token) {
          const userWithLogin: LoginResponse = {
            ...response,
            login: response.login || credentials.login,
          };
          this.storage?.setItem('currentUser', JSON.stringify(userWithLogin));
          this.currentUserSubject.next(userWithLogin);
          this.currentUserSignal.set(userWithLogin);
          if (userWithLogin.userId != null) {
            // Garantiza que los flags de acceso del perfil (/me/:userId)
            // completen la sesión aunque /login devuelva sólo el token.
            this.getUser(userWithLogin.userId).subscribe({ error: () => undefined });
          }
        }
      }),
    );
  }

  public changePassword(data: ChangePasswordRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/change-password`, data).pipe(
      tap((response) => {
        if (response) {
          const current = this.currentUserValue;
          const merged: LoginResponse = current
            ? { ...current, ...response, token: response.token || current.token }
            : response;
          this.storage?.setItem('currentUser', JSON.stringify(merged));
          this.currentUserSubject.next(merged);
          this.currentUserSignal.set(merged);
        }
      }),
    );
  }

  public logout(): void {
    this.storage?.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.currentUserSignal.set(null);
  }

  public isLoggedIn(): boolean {
    return !!this.currentUserValue;
  }
}
