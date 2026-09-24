import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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
        if (!parsed.login && parsed.userId) {
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
    return this.http.get<LoginResponse>(`${this.apiUrl}/me/${userId}`).pipe(
      tap((fullUser) => {
        if (fullUser?.login) {
          const current = this.currentUserValue;
          const merged: LoginResponse = current
            ? { ...current, ...fullUser }
            : fullUser;
          this.storage?.setItem('currentUser', JSON.stringify(merged));
          this.currentUserSubject.next(merged);
          this.currentUserSignal.set(merged);
        }
      }),
    );
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
