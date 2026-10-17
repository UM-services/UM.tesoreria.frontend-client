import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BuscadorPersonaComponent, PersonaBusqueda } from '@tesoreria/ui-layout';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import {
  Documento,
  Domicilio,
  DomicilioEditable,
  FACULTAD_POR_DEFECTO,
  Localidad,
  Persona,
  Provincia,
  Sexo,
} from './feature-personas.models';
import { PersonasService } from './feature-personas.service';

interface Mensaje {
  tipo: 'error' | 'ok' | 'aviso';
  texto: string;
}

/** Longitud del CBU que acepta el legado al recuperarlo de la última factura de contrato. */
const LONGITUD_CBU = 22;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Compara nombres de maestros ignorando mayúsculas, tildes y espacios sobrantes. */
function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase();
}

/**
 * ABM de Personas: equivalente a `frmPersona` del VB6 (persona + domicilio + recuperación de CBU).
 * Las reglas que deciden datos (normalización de apellido y nombre, conservación de campos
 * que la pantalla no maneja) las aplica core; acá sólo se captura y se valida el formato.
 */
@Component({
  selector: 'app-personas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BuscadorPersonaComponent],
  templateUrl: './feature-personas.html',
})
export class PersonasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PersonasService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute, { optional: true });

  /**
   * Texto superior del encabezado. Cada app lo puede definir en `data.eyebrow` de su ruta; si
   * no lo define se muestra el de Administración.
   */
  protected readonly eyebrow: string =
    (this.route?.snapshot.data['eyebrow'] as string | undefined) ?? 'Administración / Parámetros';

  readonly documentos = signal<Documento[]>([]);
  readonly provincias = signal<Provincia[]>([]);
  readonly localidades = signal<Localidad[]>([]);
  /** Persona tal como la devolvió core la última vez; `null` mientras se trabaja en un alta. */
  readonly personaCargada = signal<Persona | null>(null);
  readonly mensaje = signal<Mensaje | null>(null);
  readonly avisoPostal = signal<string | null>(null);
  /** CBU recuperado de la última factura de contrato, pendiente de confirmación. */
  readonly cbuPropuesto = signal<string | null>(null);
  readonly ocupado = signal(false);
  readonly textoBusqueda = signal('');

  /** Facultad con la que se arman los combos de provincia y localidad. */
  private facultadId = FACULTAD_POR_DEFECTO;

  readonly form = this.fb.nonNullable.group({
    personaId: this.fb.nonNullable.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    documentoId: this.fb.nonNullable.control<number | null>(null, Validators.required),
    apellido: ['', Validators.required],
    nombre: ['', Validators.required],
    sexo: this.fb.nonNullable.control<'' | Sexo>('', Validators.required),
    cuit: [''],
    cbu: [''],
    domicilio: this.fb.nonNullable.group({
      calle: [''],
      puerta: [''],
      piso: [''],
      dpto: [''],
      telefono: [''],
      movil: [''],
      codigoPostal: [''],
      observaciones: [''],
      provinciaId: this.fb.nonNullable.control<number | null>(null),
      localidadId: this.fb.nonNullable.control<number | null>(null),
      emailPersonal: [''],
      emailInstitucional: [''],
      laboral: [''],
    }),
  });

  ngOnInit(): void {
    this.service
      .documentos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documentos) => this.documentos.set(documentos ?? []),
        error: (e: unknown) => this.fallo('No se pudieron cargar los tipos de documento.', e),
      });
    this.cargarProvincias(this.facultadId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (e: unknown) => this.fallo('No se pudieron cargar las provincias.', e),
      });

    // Cambio de provincia hecho por el usuario: se recarga el combo de localidades. Los cambios
    // programáticos (carga de una persona, código postal) usan `emitEvent: false`.
    this.form.controls.domicilio.controls.provinciaId.valueChanges
      .pipe(
        tap(() =>
          this.form.controls.domicilio.controls.localidadId.setValue(null, { emitEvent: false }),
        ),
        switchMap((provinciaId) => this.cargarLocalidades(this.facultadId, provinciaId)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (e: unknown) => this.fallo('No se pudieron cargar las localidades.', e),
      });
  }

  /** Persona elegida en el buscador por apellido y nombre. */
  elegirPersona(elegida: PersonaBusqueda): void {
    const personaId = Number(elegida.personaId);
    if (!Number.isFinite(personaId)) {
      this.fallo('La persona elegida no tiene un número válido.');
      return;
    }
    this.ocupado.set(true);
    this.limpiarMensaje();
    this.service
      .persona(personaId, elegida.documentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (persona) => this.recibirPersona(persona, 'No se encontró la persona elegida.'),
        error: (e: unknown) => this.fallo('No se pudo consultar la persona.', e),
      });
  }

  /** Búsqueda por número, como el Enter sobre el ID del VB6. */
  buscarPorNumero(): void {
    const personaId = this.form.controls.personaId.value;
    if (personaId == null || personaId < 1) {
      this.form.controls.personaId.markAsTouched();
      this.mostrar('aviso', 'Ingrese un número de persona válido.');
      return;
    }
    this.ocupado.set(true);
    this.limpiarMensaje();
    this.service
      .personaPorNumero(personaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (persona) =>
          this.recibirPersona(
            persona,
            'No existe una persona con ese número. Complete los datos para darla de alta.',
          ),
        error: (e: unknown) => this.fallo('No se pudo consultar la persona.', e),
      });
  }

  limpiar(): void {
    this.personaCargada.set(null);
    this.cbuPropuesto.set(null);
    this.avisoPostal.set(null);
    this.textoBusqueda.set('');
    this.limpiarMensaje();
    this.form.controls.personaId.enable();
    this.form.controls.documentoId.enable();
    this.form.reset({}, { emitEvent: false });
    this.localidades.set([]);
    if (this.facultadId !== FACULTAD_POR_DEFECTO) {
      this.facultadId = FACULTAD_POR_DEFECTO;
      this.cargarProvincias(this.facultadId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (e: unknown) => this.fallo('No se pudieron cargar las provincias.', e),
        });
    }
  }

  /**
   * Completa observaciones, provincia y localidad a partir del código postal. Sólo se pueden
   * elegir provincias y localidades que ya existen en el maestro: core no tiene endpoints de
   * alta para ellas, que es lo que hacía el VB6 al no encontrarlas.
   */
  buscarPostal(): void {
    const domicilio = this.form.controls.domicilio;
    const codigo = Number(domicilio.controls.codigoPostal.value.trim());
    if (!Number.isInteger(codigo) || codigo <= 0) {
      return;
    }
    this.avisoPostal.set(null);
    this.service
      .postal(codigo)
      .pipe(
        switchMap((postal): Observable<void> => {
          if (!postal) {
            this.avisoPostal.set(`No se encontró el código postal ${codigo}.`);
            return of(undefined);
          }
          if (!domicilio.controls.observaciones.value.trim()) {
            domicilio.controls.observaciones.setValue(postal.distrito ?? '');
          }
          const provincia = this.provincias().find(
            (p) => normalizar(p.nombre) === normalizar(postal.provincia),
          );
          if (!provincia) {
            this.avisoPostal.set(
              `La provincia "${postal.provincia}" no está en el maestro de provincias: elija una existente.`,
            );
            domicilio.markAsDirty();
            return of(undefined);
          }
          domicilio.controls.provinciaId.setValue(provincia.provinciaId, { emitEvent: false });
          return this.cargarLocalidades(this.facultadId, provincia.provinciaId).pipe(
            map((localidades) => {
              const localidad = localidades.find(
                (l) => normalizar(l.nombre) === normalizar(postal.localidad),
              );
              domicilio.controls.localidadId.setValue(localidad?.localidadId ?? null, {
                emitEvent: false,
              });
              if (!localidad) {
                this.avisoPostal.set(
                  `La localidad "${postal.localidad}" no está cargada para esa provincia: elija una existente.`,
                );
              }
              domicilio.markAsDirty();
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        error: (e: unknown) => this.fallo('No se pudo consultar el código postal.', e),
      });
  }

  guardar(): void {
    this.limpiarMensaje();
    const valores = this.form.getRawValue();
    if (
      this.form.invalid ||
      valores.personaId == null ||
      valores.documentoId == null ||
      valores.sexo === ''
    ) {
      this.form.markAllAsTouched();
      this.mostrar('error', 'Complete número, tipo de documento, apellido, nombre y sexo.');
      return;
    }

    const domicilioModificado = this.form.controls.domicilio.dirty;
    this.ocupado.set(true);
    this.service
      .guardarPersona({
        personaId: valores.personaId,
        documentoId: valores.documentoId,
        apellido: valores.apellido.trim(),
        nombre: valores.nombre.trim(),
        sexo: valores.sexo,
        cuit: valores.cuit.trim(),
        cbu: valores.cbu.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guardada) => {
          this.personaCargada.set(guardada);
          this.bloquearClave();
          if (!domicilioModificado) {
            this.terminarGuardado('Persona guardada.');
            return;
          }
          this.service
            .guardarDomicilio(this.domicilioEditable(guardada))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => this.terminarGuardado('Persona y domicilio guardados.'),
              error: (e: unknown) => {
                this.ocupado.set(false);
                this.mostrar(
                  'error',
                  `La persona se guardó, pero el domicilio no pudo guardarse.${this.detalle(e)}`,
                );
              },
            });
        },
        error: (e: unknown) => this.fallo('No se pudo guardar la persona.', e),
      });
  }

  recuperarCbu(): void {
    const persona = this.personaCargada();
    if (!persona) {
      return;
    }
    this.ocupado.set(true);
    this.limpiarMensaje();
    this.service
      .ultimoCbu(persona.personaId, persona.documentoId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cbu) => {
          this.ocupado.set(false);
          if (cbu && cbu.length === LONGITUD_CBU) {
            this.cbuPropuesto.set(cbu);
          } else {
            this.mostrar(
              'aviso',
              `La última factura de contrato no tiene un CBU de ${LONGITUD_CBU} caracteres.`,
            );
          }
        },
        error: (e: unknown) => this.fallo('No se pudo recuperar el CBU.', e),
      });
  }

  /** Confirma el CBU recuperado: se guarda sólo la persona, como en el VB6. */
  aceptarCbu(): void {
    const cbu = this.cbuPropuesto();
    const persona = this.personaCargada();
    if (!cbu || !persona) {
      return;
    }
    this.ocupado.set(true);
    this.service
      .guardarPersona({
        personaId: persona.personaId,
        documentoId: persona.documentoId,
        apellido: persona.apellido,
        nombre: persona.nombre,
        sexo: persona.sexo,
        cuit: persona.cuit,
        cbu,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guardada) => {
          this.personaCargada.set(guardada);
          this.form.controls.cbu.setValue(guardada.cbu ?? '');
          this.cbuPropuesto.set(null);
          this.terminarGuardado('CBU actualizado.');
        },
        error: (e: unknown) => this.fallo('No se pudo actualizar el CBU.', e),
      });
  }

  cancelarCbu(): void {
    this.cbuPropuesto.set(null);
  }

  /** El mail inválido sólo se marca en rojo y no impide guardar (igual que el VB6). */
  emailInvalido(campo: 'emailPersonal' | 'emailInstitucional'): boolean {
    const valor = this.form.controls.domicilio.controls[campo].value.trim();
    return valor !== '' && !EMAIL.test(valor);
  }

  cbuConLongitudRara(): boolean {
    const cbu = this.form.controls.cbu.value.trim();
    return cbu !== '' && cbu.length !== LONGITUD_CBU;
  }

  protected readonly longitudCbu = LONGITUD_CBU;

  private recibirPersona(persona: Persona | null, textoSiNoExiste: string): void {
    if (!persona) {
      this.ocupado.set(false);
      this.mostrar('aviso', textoSiNoExiste);
      return;
    }
    this.personaCargada.set(persona);
    this.cbuPropuesto.set(null);
    this.avisoPostal.set(null);
    this.form.patchValue(
      {
        personaId: persona.personaId,
        documentoId: persona.documentoId,
        apellido: persona.apellido ?? '',
        nombre: persona.nombre ?? '',
        sexo: persona.sexo === 'M' || persona.sexo === 'F' ? persona.sexo : '',
        cuit: persona.cuit ?? '',
        cbu: persona.cbu ?? '',
      },
      { emitEvent: false },
    );
    this.bloquearClave();

    this.service
      .domicilio(persona.personaId, persona.documentoId)
      .pipe(
        switchMap((domicilio) => {
          this.facultadId = domicilio?.facultadId ?? FACULTAD_POR_DEFECTO;
          return this.cargarCombos(this.facultadId, domicilio?.provinciaId ?? null).pipe(
            map(() => domicilio),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (domicilio) => {
          this.form.controls.domicilio.reset(this.valoresDomicilio(domicilio), {
            emitEvent: false,
          });
          this.form.markAsPristine();
          this.ocupado.set(false);
        },
        error: (e: unknown) => this.fallo('No se pudo cargar el domicilio de la persona.', e),
      });
  }

  /**
   * Carga los combos de provincia y localidad del domicilio. Si alguno falla no se pierde el
   * resto del domicilio: se deja el combo vacío y se avisa qué pedido falló.
   */
  private cargarCombos(facultadId: number, provinciaId: number | null): Observable<void> {
    return this.cargarProvincias(facultadId).pipe(
      catchError((e: unknown) => {
        this.provincias.set([]);
        this.avisarCombo(`las provincias de la facultad ${facultadId}`, e);
        return of([]);
      }),
      switchMap(() =>
        this.cargarLocalidades(facultadId, provinciaId).pipe(
          catchError((e: unknown) => {
            this.localidades.set([]);
            this.avisarCombo(`las localidades de la provincia ${provinciaId}`, e);
            return of([]);
          }),
        ),
      ),
      map(() => undefined),
    );
  }

  private avisarCombo(que: string, error: unknown): void {
    this.mostrar(
      'aviso',
      `No se pudieron cargar ${que}${this.detalle(error)}. El resto del domicilio se muestra igual.`,
    );
  }

  private valoresDomicilio(domicilio: Domicilio | null) {
    return {
      calle: domicilio?.calle ?? '',
      puerta: domicilio?.puerta ?? '',
      piso: domicilio?.piso ?? '',
      dpto: domicilio?.dpto ?? '',
      telefono: domicilio?.telefono ?? '',
      movil: domicilio?.movil ?? '',
      codigoPostal: domicilio?.codigoPostal ?? '',
      observaciones: domicilio?.observaciones ?? '',
      provinciaId: domicilio?.provinciaId ?? null,
      localidadId: domicilio?.localidadId ?? null,
      emailPersonal: domicilio?.emailPersonal ?? '',
      emailInstitucional: domicilio?.emailInstitucional ?? '',
      laboral: domicilio?.laboral ?? '',
    };
  }

  private domicilioEditable(persona: Persona): DomicilioEditable {
    const d = this.form.controls.domicilio.getRawValue();
    return {
      personaId: persona.personaId,
      documentoId: persona.documentoId,
      calle: d.calle.trim(),
      puerta: d.puerta.trim(),
      piso: d.piso.trim(),
      dpto: d.dpto.trim(),
      telefono: d.telefono.trim(),
      movil: d.movil.trim(),
      observaciones: d.observaciones.trim(),
      codigoPostal: d.codigoPostal.trim(),
      facultadId: this.facultadId,
      provinciaId: d.provinciaId,
      localidadId: d.localidadId,
      emailPersonal: d.emailPersonal.trim(),
      emailInstitucional: d.emailInstitucional.trim(),
      laboral: d.laboral.trim(),
    };
  }

  private cargarProvincias(facultadId: number): Observable<Provincia[]> {
    return this.service
      .provincias(facultadId)
      .pipe(tap((provincias) => this.provincias.set(provincias ?? [])));
  }

  private cargarLocalidades(
    facultadId: number,
    provinciaId: number | null,
  ): Observable<Localidad[]> {
    if (provinciaId == null) {
      this.localidades.set([]);
      return of([]);
    }
    return this.service
      .localidades(facultadId, provinciaId)
      .pipe(tap((localidades) => this.localidades.set(localidades ?? [])));
  }

  /** Con la persona identificada, la clave (número y documento) deja de editarse. */
  private bloquearClave(): void {
    this.form.controls.personaId.disable({ emitEvent: false });
    this.form.controls.documentoId.disable({ emitEvent: false });
  }

  private terminarGuardado(texto: string): void {
    this.form.markAsPristine();
    this.ocupado.set(false);
    this.mostrar('ok', texto);
  }

  private limpiarMensaje(): void {
    this.mensaje.set(null);
  }

  private mostrar(tipo: Mensaje['tipo'], texto: string): void {
    this.mensaje.set({ tipo, texto });
  }

  private fallo(texto: string, error?: unknown): void {
    this.ocupado.set(false);
    this.mostrar('error', `${texto}${this.detalle(error)}`);
  }

  private detalle(error: unknown): string {
    return error instanceof HttpErrorResponse ? ` (HTTP ${error.status})` : '';
  }
}