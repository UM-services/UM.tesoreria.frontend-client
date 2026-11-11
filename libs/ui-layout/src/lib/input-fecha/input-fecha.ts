import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
} from '@angular/forms';
import {
  formatearTextoFecha,
  isoATextoFecha,
  posicionCursor,
  textoFechaAIso,
} from './fecha-input.util';

/**
 * Input de fecha que **siempre** muestra `dd/mm/aaaa`, sin depender del locale del
 * navegador ni del sistema operativo (el `<input type="date">` nativo se muestra con
 * el formato del equipo y no se puede forzar).
 *
 * Es un `ControlValueAccessor`: se usa con `formControlName` y el valor del formulario
 * sigue siendo ISO `yyyy-MM-dd` (o `''`), igual que antes. Mantiene el botón de
 * calendario para quien prefiera elegir con el selector nativo.
 *
 * ```html
 * <ui-input-fecha inputId="desde" formControlName="desde"></ui-input-fecha>
 * ```
 */
@Component({
  selector: 'ui-input-fecha',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFechaComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => InputFechaComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './input-fecha.html',
})
export class InputFechaComponent implements ControlValueAccessor, Validator {
  /** `id` del input interno, para que el `<label for="...">` lo apunte. */
  @Input() inputId = '';
  @Input() placeholder = 'dd/mm/aaaa';
  @Input() conCalendario = true;

  /**
   * Valor ISO (`yyyy-MM-dd`) para usar con bindings directos, sin formulario:
   * `[valor]="fecha()" (valorChange)="fecha.set($event)"`.
   */
  @Input()
  set valor(valor: string | null | undefined) {
    this.writeValue(valor);
  }

  get valor(): string {
    return this.valorIso;
  }

  /** Deshabilitado para bindings directos (sin formulario). */
  @Input()
  set disabled(valor: boolean) {
    this.deshabilitado = valor;
  }

  get disabled(): boolean {
    return this.deshabilitado;
  }

  @Output() readonly valorChange = new EventEmitter<string>();

  @ViewChild('campoTexto') private textoRef?: ElementRef<HTMLInputElement>;
  @ViewChild('nativo') private nativoRef?: ElementRef<HTMLInputElement>;

  public texto = '';
  public valorIso = '';
  public deshabilitado = false;

  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  writeValue(valor: string | null | undefined): void {
    this.valorIso = valor ?? '';
    this.texto = isoATextoFecha(this.valorIso);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
  }

  /** Vacío no es error de formato: eso lo decide el `Validators.required` del formulario. */
  validate(): ValidationErrors | null {
    if (!this.texto.trim()) {
      return null;
    }
    return this.valorIso ? null : { fechaInvalida: true };
  }

  alEscribir(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const bruto = input.value;
    const cursor = input.selectionStart ?? bruto.length;
    const digitosAntes = bruto.slice(0, cursor).replace(/\D/g, '').length;

    const formateado = formatearTextoFecha(bruto);
    input.value = formateado;
    const posicion = posicionCursor(formateado, digitosAntes);
    input.setSelectionRange(posicion, posicion);

    this.texto = formateado;
    this.emitir();
  }

  alSalir(): void {
    this.onTouched();
  }

  alElegirEnCalendario(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.valorIso = valor;
    this.texto = isoATextoFecha(valor);
    this.onChange(valor);
    this.onValidatorChange();
    this.valorChange.emit(valor);
    this.onTouched();
  }

  abrirCalendario(): void {
    const nativo = this.nativoRef?.nativeElement;
    if (!nativo || this.deshabilitado) {
      return;
    }
    nativo.value = this.valorIso;
    const conSelector = 'showPicker' in nativo;
    if (conSelector) {
      try {
        nativo.showPicker();
        return;
      } catch {
        // Algunos navegadores exigen activación del usuario: se cae al click.
      }
    }
    nativo.click();
  }

  /** Reenfoca el campo de texto (útil para el formulario que lo contiene). */
  focus(): void {
    this.textoRef?.nativeElement.focus();
  }

  private emitir(): void {
    const iso = textoFechaAIso(this.texto);
    this.valorIso = iso ?? '';
    this.onChange(this.valorIso);
    this.onValidatorChange();
    this.valorChange.emit(this.valorIso);
  }
}
