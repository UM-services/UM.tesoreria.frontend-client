import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_URL, AuthService } from '@tesoreria/shared-api';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: API_URL, useValue: '' }],
    }).compileComponents();
  });

  it('should create', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el menú completo para la sede principal (geograficaId 1)', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 1,
      nombre: 'Usuario Central',
      sede: 'Posadas',
      geograficaId: 1,
    });

    const fixture = TestBed.createComponent(AppComponent);
    const paths = fixture.componentInstance.menuItems().map(item => item.path);
    expect(paths).toEqual([
      '/pendientes-pre-guarani',
      '/guarani-ubicaciones',
      '/guarani-beneficios',
      '/datos-personales',
    ]);
  });

  it('muestra Pendientes Pre Guaraní y Datos Personales para una sede con geograficaId distinto de 1', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 2,
      nombre: 'Usuario Sede',
      sede: 'Obera',
      geograficaId: 2,
    });

    const fixture = TestBed.createComponent(AppComponent);
    const paths = fixture.componentInstance.menuItems().map(item => item.path);
    expect(paths).toEqual(['/pendientes-pre-guarani', '/datos-personales']);
  });

  it('muestra el menú completo cuando el usuario no expone geograficaId', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUserSignal.set({
      token: 'token',
      userId: 3,
      nombre: 'Usuario Sin Sede',
      sede: 'Sede',
    });

    const fixture = TestBed.createComponent(AppComponent);
    const paths = fixture.componentInstance.menuItems().map(item => item.path);
    expect(paths).toEqual([
      '/pendientes-pre-guarani',
      '/guarani-ubicaciones',
      '/guarani-beneficios',
      '/datos-personales',
    ]);
  });
});
