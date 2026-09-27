import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { API_URL } from '@tesoreria/shared-api';
import { NoAccesoComponent } from './no-acceso';

@Component({ standalone: true, selector: 'lib-login-stub', template: '' })
class LoginStubComponent {}

describe('NoAccesoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoAccesoComponent],
      providers: [
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        provideHttpClient(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();
  });

  it('muestra el mensaje de acceso restringido', () => {
    const { nativeElement } = TestBed.createComponent(NoAccesoComponent);
    expect(nativeElement.textContent).toContain('Acceso restringido');
    expect(nativeElement.textContent).toContain('no está habilitado para su usuario');
  });

  it('el botón cierra la sesión guardada', () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ token: 'jwt', userId: 9, nombre: 'Sin Permiso', sede: 'Mendoza' }),
    );
    const fixture = TestBed.createComponent(NoAccesoComponent);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Cerrar sesión'),
    ) as HTMLButtonElement;

    button.click();

    expect(localStorage.getItem('currentUser')).toBeNull();
  });
});
