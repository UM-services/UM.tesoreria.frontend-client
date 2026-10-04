import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { BuscadorPersonaComponent } from '@tesoreria/ui-layout';
import { DatosPersonalesComponent } from './datos-personales.component';
import { DatosPersonalesService } from './datos-personales.service';

describe('DatosPersonalesComponent', () => {
  let fixture: ComponentFixture<DatosPersonalesComponent>;
  let servicio: {
    consultar: ReturnType<typeof vi.fn>;
    consultarBeneficios: ReturnType<typeof vi.fn>;
    capturar: ReturnType<typeof vi.fn>;
    crearPreuniversitario: ReturnType<typeof vi.fn>;
  };

  const buscador = () =>
    fixture.debugElement.query(By.css('ui-buscador-persona'))
      .componentInstance as BuscadorPersonaComponent;

  beforeEach(() => {
    servicio = {
      consultar: vi.fn().mockReturnValue(of({ persona: 28999111 })),
      consultarBeneficios: vi.fn().mockReturnValue(of([])),
      capturar: vi.fn().mockReturnValue(of([])),
      crearPreuniversitario: vi.fn().mockReturnValue(of([])),
    };
    TestBed.configureTestingModule({
      imports: [DatosPersonalesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: DatosPersonalesService, useValue: servicio },
      ],
    });
    fixture = TestBed.createComponent(DatosPersonalesComponent);
    fixture.detectChanges();
  });

  it('renderiza el buscador de personas compartido', () => {
    expect(fixture.nativeElement.querySelector('#personaNombre')).not.toBeNull();
    expect(buscador()).toBeInstanceOf(BuscadorPersonaComponent);
  });

  it('el buscador completa el documento, muestra el nombre y consulta al seleccionar', async () => {
    const input = fixture.nativeElement.querySelector('#personaNombre') as HTMLInputElement;
    input.value = 'pereyra';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    let respondida = false;
    await vi.waitFor(
      () => {
        if (respondida) {
          return;
        }
        const peticiones = http.match((r) => r.url.endsWith('/persona/search'));
        expect(peticiones.length).toBe(1);
        peticiones[0].flush([
          { uniqueId: 13, personaId: 28999111, documentoId: 1, apellido: 'PEREYRA', nombre: 'Ana' },
        ]);
        respondida = true;
      },
      { timeout: 2000 },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const fila = fixture.nativeElement.querySelector('[role="option"]') as HTMLElement;
    fila.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    // El pedido de sugerencias ya fue respondido; no quedan peticiones pendientes.
    http.verify();

    expect(buscador().texto()).toBe('PEREYRA, Ana');
    expect(servicio.consultar).toHaveBeenCalledWith('28999111');
    expect(
      (fixture.nativeElement.querySelector('#documentoAlumno') as HTMLInputElement).value,
    ).toBe('28999111');
  });

  it('escribir el documento a mano limpia el nombre de la persona buscada', () => {
    buscador().texto.set('PEREYRA, Ana');

    const input = fixture.nativeElement.querySelector('#documentoAlumno') as HTMLInputElement;
    input.value = '30123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.documento).toBe('30123456');
    expect(buscador().texto()).toBe('');
  });

  it('mantiene la validación del documento escrito a mano', () => {
    const component = fixture.componentInstance;
    component.documento = '12 34';
    component.consultar();

    expect(component.validationMessage).toContain('letras y números');
    expect(component.documentoConsultado).toBeNull();
  });
});
