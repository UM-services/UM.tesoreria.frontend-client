import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { beforeEach, describe, expect, it } from 'vitest';
import { InputFechaComponent } from './input-fecha';

function eventoInput(valor: string): Event {
  const input = {
    value: valor,
    selectionStart: valor.length,
    setSelectionRange: () => undefined,
  };
  return { target: input } as unknown as Event;
}

describe('InputFechaComponent', () => {
  let component: InputFechaComponent;
  let control: FormControl;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InputFechaComponent] });
    component = TestBed.createComponent(InputFechaComponent).componentInstance;
    control = new FormControl('');

    component.registerOnChange((valor) => control.setValue(valor, { emitEvent: false }));
    component.registerOnValidatorChange(() => control.updateValueAndValidity({ emitEvent: false }));
    control.setValidators(() => component.validate());
  });

  it('muestra dd/mm/aaaa a partir de un valor ISO', () => {
    component.writeValue('2026-10-26');

    expect(component.texto).toBe('26/10/2026');
    expect(component.valorIso).toBe('2026-10-26');
  });

  it('formatea mientras se escribe y emite ISO al formulario', () => {
    component.alEscribir(eventoInput('31122026'));

    expect(component.texto).toBe('31/12/2026');
    expect(control.value).toBe('2026-12-31');
    expect(control.valid).toBe(true);
  });

  it('acepta dígitos sin barras', () => {
    component.alEscribir(eventoInput('01022027'));

    expect(component.texto).toBe('01/02/2027');
    expect(control.value).toBe('2027-02-01');
  });

  it('marca la fecha inexistente como inválida y no emite valor', () => {
    component.alEscribir(eventoInput('31022026'));

    expect(component.texto).toBe('31/02/2026');
    expect(control.value).toBe('');
    expect(control.hasError('fechaInvalida')).toBe(true);
  });

  it('vacío no es error de formato (lo decide required)', () => {
    component.alEscribir(eventoInput(''));

    expect(component.texto).toBe('');
    expect(component.validate()).toBeNull();
  });

  it('toma el valor elegido en el calendario nativo', () => {
    component.alElegirEnCalendario({ target: { value: '2026-12-31' } } as unknown as Event);

    expect(component.texto).toBe('31/12/2026');
    expect(control.value).toBe('2026-12-31');
  });

  it('renderiza el texto formateado en el input (no el elemento)', () => {
    const fixture = TestBed.createComponent(InputFechaComponent);
    fixture.componentInstance.writeValue('2026-10-26');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('26/10/2026');
  });

  it('soporta el binding directo [valor] / (valorChange)', () => {
    const emitidos: string[] = [];
    component.valorChange.subscribe((valor) => emitidos.push(valor));

    component.valor = '2026-10-26';
    expect(component.texto).toBe('26/10/2026');

    component.alEscribir(eventoInput('01022027'));
    expect(emitidos).toEqual(['2027-02-01']);
  });

  it('propaga el estado deshabilitado', () => {
    component.disabled = true;
    expect(component.deshabilitado).toBe(true);

    component.setDisabledState(false);
    expect(component.disabled).toBe(false);
  });
});
