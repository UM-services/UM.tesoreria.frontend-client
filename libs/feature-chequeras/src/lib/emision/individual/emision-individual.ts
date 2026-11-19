import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  BuscadorPersonaComponent,
  InputFechaComponent,
  PersonaBusqueda,
} from '@tesoreria/ui-layout';
import { AuthService } from '@tesoreria/shared-api';
import { descargarBlob } from '../../cobranzas/shared/descarga-archivo';
import { EntregaService } from '../data-access/entrega.service';
import {
  SIN_CUOTAS_ADEUDADAS,
  mensajeImpresionBorrador,
  sinCuotasAdeudadas,
} from '../data-access/impresion-borrador';
import { EmisionService } from '../data-access/emision.service';
import {
  ActualizarBorradorRequest,
  BorradorChequera,
  BorradorCuota,
  ContextoEmision,
  CrearBorradorRequest,
  CuotaEdicion,
  FacultadDisenho,
  LectivoOpcion,
  ResultadoEmision,
  SerieEmision,
  TipoChequeraDisenho,
} from '../models/emision.models';

/**
 * Wizard de emisión individual de chequeras (migración de frmImpChequera).
 *
 * Paso 1: persona y chequera. Paso 2: cuotas, beca y mails. Paso 3: confirmación.
 * Paso 4: entrega (PDF / correo) de la chequera ya emitida.
 */
@Component({
  selector: 'app-emision-individual',
  standalone: true,
  imports: [RouterModule, BuscadorPersonaComponent, InputFechaComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './emision-individual.html',
})
export class EmisionIndividualComponent implements OnInit {
  private readonly emision = inject(EmisionService);
  private readonly entrega = inject(EntregaService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  readonly paso = signal(1);
  readonly etapas = [
    { numero: 1, titulo: 'Persona y chequera' },
    { numero: 2, titulo: 'Cuotas, beca y mails' },
    { numero: 3, titulo: 'Confirmación' },
    { numero: 4, titulo: 'Entrega' },
  ] as const;
  readonly texto = signal('');
  readonly persona = signal<PersonaBusqueda | null>(null);
  readonly lectivos = signal<LectivoOpcion[]>([]);
  readonly lectivoId = signal<number | null>(null);
  readonly contexto = signal<ContextoEmision | null>(null);
  readonly borrador = signal<BorradorChequera | null>(null);
  readonly resultado = signal<ResultadoEmision | null>(null);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

  readonly facultades = signal<FacultadDisenho[]>([]);
  readonly tiposChequera = signal<TipoChequeraDisenho[]>([]);
  readonly facultadNueva = signal<number | null>(null);
  readonly tipoNueva = signal<number | null>(null);

  /** Sede del usuario logueado: el legacy usa `geograficaIdApp` de la sesión. */
  readonly sedeId = computed(() => this.auth.currentUserSignal()?.geograficaId ?? null);
  readonly sedeNombre = computed(() => this.auth.currentUserSignal()?.sede ?? 'Sin sede asignada');

  readonly arancelTipoId = signal<number | null>(null);
  readonly alternativaId = signal<number | null>(null);
  readonly cursoId = signal<number | null>(null);
  readonly fecha = signal(hoy());
  readonly becaPorcentaje = signal(0);
  readonly becaResolucion = signal('');
  readonly becaFecha = signal(hoy());
  readonly calculaBeca = signal(false);
  readonly hpum = signal(false);
  readonly emailPersonal = signal('');
  readonly emailInstitucional = signal('');
  readonly incluyeBarras = signal(false);
  readonly copiaFacultad = signal(false);

  readonly cuotaSeleccionada = signal<BorradorCuota | null>(null);
  readonly editVenc1 = signal('');
  readonly editVenc2 = signal('');
  readonly editVenc3 = signal('');
  readonly editImporte1 = signal(0);
  readonly editImporte2 = signal(0);
  readonly editImporte3 = signal(0);

  readonly forzarNueva = signal(false);
  readonly forzarDeuda = signal(false);
  readonly motivoOverride = signal('');
  readonly claveIdempotencia = signal(globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
  readonly emailEnviado = signal<string | null>(null);

  readonly total = computed(() => this.borrador()?.totalBorrador ?? 0);
  readonly alternativaTitulo = computed(() => {
    const alternativaId = this.alternativaId();
    if (alternativaId === null) {
      return null;
    }
    return (
      this.borrador()?.alternativas.find((alternativa) => alternativa.alternativaId === alternativaId)
        ?.titulo ?? null
    );
  });
  readonly cuotasPendientes = computed(
    () => this.borrador()?.cuotas.filter((cuota) => cuota.pagado === 0 && cuota.baja === 0) ?? [],
  );

  ngOnInit(): void {
    this.cargarLectivos();
    const borradorId = this.route.snapshot.paramMap.get('borradorId');
    if (borradorId) {
      this.abrirBorrador(Number(borradorId));
    }
  }

  private cargarLectivos(): void {
    this.emision.lectivos().subscribe({
      next: (lectivos) => {
        this.lectivos.set(lectivos);
        if (this.lectivoId() === null && lectivos.length > 0) {
          this.lectivoId.set(lectivos[0].lectivoId);
        }
      },
      error: () => this.error.set('No se pudieron cargar los lectivos del sistema'),
    });
  }

  nombreLectivo(lectivoId: number | null): string {
    if (lectivoId === null) {
      return '—';
    }
    return this.lectivos().find((lectivo) => lectivo.lectivoId === lectivoId)?.nombre ?? String(lectivoId);
  }

  elegirPersona(persona: PersonaBusqueda): void {
    this.persona.set(persona);
    this.contexto.set(null);
    this.borrador.set(null);
    this.resultado.set(null);
    this.paso.set(1);
    this.cargarContexto();
  }

  cambiarLectivo(valor: string): void {
    const lectivo = Number(valor);
    if (lectivo > 0) {
      this.lectivoId.set(lectivo);
      if (this.persona()) {
        this.cargarContexto();
      }
    }
  }

  cambiarFacultad(valor: string): void {
    const facultadId = Number(valor);
    if (facultadId <= 0) {
      return;
    }
    this.facultadNueva.set(facultadId);
    this.tipoNueva.set(null);
    this.cargarTiposChequera(facultadId);
  }

  usarSerie(serie: SerieEmision): void {
    if (serie.deBaja) {
      this.error.set(
        'La chequera ' +
          serie.chequeraSerieId +
          ' está dada de baja: no se puede editar ni emitir. Cree una chequera nueva.',
      );
      return;
    }
    // El legacy precarga el combo con el arancel de la chequera al seleccionar la fila
    // (frmImpChequera:1040): sin esto el paso 2 arranca sin arancel y la emisión falla.
    this.arancelTipoId.set(serie.arancelTipoId ?? null);
    this.crearBorrador(serie.facultadId, serie.tipoChequeraId, serie.chequeraSerieId);
  }

  crearNueva(): void {
    if (!this.sedeId()) {
      this.error.set('La sesión no tiene una sede asignada; no se puede crear la chequera');
      return;
    }
    const facultad = this.facultadNueva();
    const tipo = this.tipoNueva();
    if (!facultad || !tipo) {
      this.error.set('Seleccione facultad y tipo de chequera para crear una chequera nueva');
      return;
    }
    this.crearBorrador(facultad, tipo, null);
  }

  private cargarFacultades(): void {
    const lectivoId = this.lectivoId();
    const sedeId = this.sedeId();
    if (!lectivoId || !sedeId) {
      this.facultades.set([]);
      return;
    }
    this.emision.facultadesDisenho(lectivoId, sedeId).subscribe({
      next: (facultades) => {
        this.facultades.set(facultades);
        const actual = this.facultadNueva();
        const elegida = facultades.some((facultad) => facultad.facultadId === actual)
          ? actual
          : (facultades[0]?.facultadId ?? null);
        this.facultadNueva.set(elegida);
        if (elegida) {
          this.cargarTiposChequera(elegida);
        } else {
          this.tiposChequera.set([]);
          this.tipoNueva.set(null);
        }
      },
      error: () => this.error.set('No se pudieron cargar las facultades con diseño para la sede'),
    });
  }

  private cargarTiposChequera(facultadId: number): void {
    const lectivoId = this.lectivoId();
    const sedeId = this.sedeId();
    if (!lectivoId || !sedeId) {
      return;
    }
    this.emision.tiposChequeraDisenho(facultadId, lectivoId, sedeId).subscribe({
      next: (tipos) => {
        this.tiposChequera.set(tipos);
        const actual = this.tipoNueva();
        const elegido = tipos.some((tipo) => tipo.tipoChequeraId === actual)
          ? actual
          : (tipos[0]?.tipoChequeraId ?? null);
        this.tipoNueva.set(elegido);
      },
      error: () => this.error.set('No se pudieron cargar los tipos de chequera con diseño'),
    });
  }

  seleccionarCuota(cuota: BorradorCuota): void {
    if (!cuota.editable) {
      this.error.set(
        `La cuota ${clave(cuota)} no se puede modificar: está pagada, de baja, compensada o bloqueada`,
      );
      return;
    }
    this.cuotaSeleccionada.set(cuota);
    this.editVenc1.set(fechaCorta(cuota.vencimiento1));
    this.editVenc2.set(fechaCorta(cuota.vencimiento2));
    this.editVenc3.set(fechaCorta(cuota.vencimiento3));
    this.editImporte1.set(Number(cuota.importe1Borrador));
    this.editImporte2.set(Number(cuota.importe2Borrador));
    this.editImporte3.set(Number(cuota.importe3Borrador));
  }

  aplicarCambiosCuota(): void {
    this.guardar();
  }

  calcularBeca(): void {
    this.calculaBeca.set(true);
    this.guardar();
  }

  limpiarBeca(): void {
    this.becaPorcentaje.set(0);
    this.becaResolucion.set('');
    this.calculaBeca.set(false);
    this.guardar();
  }

  completar(fuente: 'DISENO' | 'PLANTILLA' | 'GUARDADAS'): void {
    const borrador = this.borrador();
    if (!borrador) {
      return;
    }
    this.cargando.set(true);
    this.emision.completar(borrador.borradorId, fuente).subscribe({
      next: (actualizado) => this.aplicarBorrador(actualizado, 2),
      error: (error) => this.fallar(error),
    });
  }

  aplicarPolitica(): void {
    const borrador = this.borrador();
    const cuota = this.cuotaSeleccionada();
    if (!borrador || !cuota) {
      this.error.set('Seleccione una cuota para aplicar la política arancelaria');
      return;
    }
    this.cargando.set(true);
    this.emision
      .politica(borrador.borradorId, cuota.productoId, cuota.alternativaId, cuota.cuotaId)
      .subscribe({
        next: (actualizado) => this.aplicarBorrador(actualizado, 2),
        error: (error) => this.fallar(error),
      });
  }

  guardar(siguientePaso = 2): void {
    const borrador = this.borrador();
    if (!borrador) {
      return;
    }
    this.cargando.set(true);
    this.emision.actualizar(borrador.borradorId, this.payload(borrador)).subscribe({
      next: (actualizado) => {
        this.aplicarBorrador(actualizado, siguientePaso);
        this.aviso.set('Borrador guardado');
      },
      error: (error) => this.fallar(error),
    });
  }

  irAConfirmacion(): void {
    const borrador = this.borrador();
    if (!borrador) {
      return;
    }
    if (!this.alternativaId()) {
      this.error.set('Seleccione una alternativa de pago');
      return;
    }
    if (!this.arancelTipoId()) {
      this.error.set('Seleccione el tipo de arancel');
      return;
    }
    if (this.cuotasPendientes().length === 0) {
      this.error.set('El borrador no tiene cuotas pendientes para emitir');
      return;
    }
    this.emailEnviado.set(null);
    this.guardar(3);
  }

  volverAPaso(paso: number): void {
    this.error.set(null);
    this.paso.set(paso);
  }

  emitir(): void {
    const borrador = this.borrador();
    if (!borrador) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.emision
      .emitir(borrador.borradorId, {
        version: borrador.version,
        forzarNueva: this.forzarNueva(),
        forzarDeuda: this.forzarDeuda(),
        motivoOverride: this.motivoOverride() || null,
        claveIdempotencia: this.claveIdempotencia(),
      })
      .subscribe({
        next: (resultado) => {
          this.cargando.set(false);
          this.resultado.set(resultado);
          this.paso.set(4);
          this.aviso.set(`Chequera ${resultado.chequeraSerieId} emitida`);
        },
        error: (error) => this.fallar(error),
      });
  }

  descargarPdf(): void {
    const resultado = this.resultado();
    if (!resultado) {
      return;
    }
    this.cargando.set(true);
    this.entrega.descargarPdf(resultado, this.incluyeBarras()).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        this.entrega.guardarPdf(
          respuesta,
          `chequera-${resultado.facultadId}-${resultado.tipoChequeraId}-${resultado.chequeraSerieId}.pdf`,
        );
      },
      error: (error) => this.fallar(error),
    });
  }

  /**
   * PDF del borrador abierto, con la leyenda BORRADOR y sin código de barras ni datos de pago.
   * Sirve para revisar en papel antes de emitir.
   */
  imprimirBorrador(): void {
    const borrador = this.borrador();
    if (!borrador || borrador.estado !== 'ABIERTO') {
      return;
    }
    this.cargando.set(true);
    this.entrega.descargarBorrador(borrador.borradorId).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);
        if (sinCuotasAdeudadas(respuesta)) {
          this.aviso.set(SIN_CUOTAS_ADEUDADAS);
          return;
        }
        descargarBlob(
          respuesta.body!,
          `borrador-chequera-${borrador.borradorId}.pdf`,
          respuesta.headers.get('Content-Disposition'),
        );
      },
      error: (error) => {
        this.cargando.set(false);
        this.aviso.set(null);
        this.error.set(mensajeImpresionBorrador(error, mensaje(error)));
      },
    });
  }

  enviarCorreo(): void {
    const resultado = this.resultado();
    if (!resultado) {
      return;
    }
    this.cargando.set(true);
    this.emailEnviado.set(null);
    this.entrega
      .enviarCorreo(resultado, this.copiaFacultad(), this.incluyeBarras())
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.emailEnviado.set('Correo enviado');
        },
        error: (error) => this.fallar(error),
      });
  }

  reiniciar(): void {
    this.borrador.set(null);
    this.resultado.set(null);
    this.cuotaSeleccionada.set(null);
    this.contexto.set(null);
    this.paso.set(1);
    this.claveIdempotencia.set(globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
    this.aviso.set(null);
    this.error.set(null);
    if (this.persona()) {
      this.cargarContexto();
    }
  }

  formatoNumero(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number(valor ?? 0),
    );
  }

  fechaVisible(valor: string | null): string {
    return fechaCorta(valor);
  }

  nombrePaso(paso: number): string {
    return this.etapas.find((etapa) => etapa.numero === paso)?.titulo ?? '';
  }

  /**
   * `canDeactivate` del wizard: avisa al salir si hay un borrador abierto a medio
   * completar (pasos 2 y 3), porque lo editado y no guardado se pierde.
   */
  hayCambiosSinGuardar(): boolean {
    return this.paso() < 4 && this.borrador()?.estado === 'ABIERTO';
  }

  fechaHoraVisible(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime())
      ? valor.slice(0, 16).replace('T', ' ')
      : fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  }

  private abrirBorrador(borradorId: number): void {
    this.cargando.set(true);
    this.emision.obtener(borradorId).subscribe({
      next: (borrador) => {
        this.emision
          .contexto(borrador.personaId, borrador.documentoId, borrador.lectivoId)
          .subscribe({
            next: (contexto) => {
              this.contexto.set(contexto);
              this.persona.set({
                uniqueId: 0,
                personaId: String(borrador.personaId),
                documentoId: borrador.documentoId,
                apellido: contexto.persona.apellido,
                nombre: contexto.persona.nombre,
              });
              this.lectivoId.set(borrador.lectivoId);
              this.aplicarBorrador(borrador, 2);
            },
            error: (error) => this.fallar(error),
          });
      },
      error: (error) => this.fallar(error),
    });
  }

  private cargarContexto(): void {
    const persona = this.persona();
    const lectivoId = this.lectivoId();
    if (!persona || !lectivoId) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.aviso.set(null);
    this.emision.contexto(Number(persona.personaId), persona.documentoId, lectivoId).subscribe({
      next: (contexto) => {
        this.contexto.set(contexto);
        this.cargando.set(false);
        if (contexto.domicilio) {
          this.emailPersonal.set(contexto.domicilio.emailPersonal ?? '');
          this.emailInstitucional.set(contexto.domicilio.emailInstitucional ?? '');
        }
        const primera = contexto.series[0];
        if (primera) {
          this.facultadNueva.set(primera.facultadId);
          this.tipoNueva.set(primera.tipoChequeraId);
        }
        this.cargarFacultades();
      },
      error: (error) => this.fallar(error),
    });
  }

  private crearBorrador(facultadId: number, tipoChequeraId: number, chequeraSerieId: number | null): void {
    const persona = this.persona();
    const lectivoId = this.lectivoId();
    if (!persona) {
      return;
    }
    if (!lectivoId) {
      this.error.set('Seleccione un lectivo antes de crear el borrador');
      return;
    }
    const request: CrearBorradorRequest = {
      personaId: Number(persona.personaId),
      documentoId: persona.documentoId,
      facultadId,
      lectivoId,
      tipoChequeraId,
      arancelTipoId: this.arancelTipoId(),
      alternativaId: this.alternativaId(),
      cursoId: this.cursoId(),
      chequeraSerieId,
      becaPorcentaje: this.becaPorcentaje() / 100,
      calculaBeca: this.calculaBeca(),
      fecha: `${this.fecha()}T00:00:00Z`,
      fuente: 'DISENO',
      emailPersonal: this.emailPersonal() || null,
      emailInstitucional: this.emailInstitucional() || null,
      incluyeBarras: this.incluyeBarras(),
      copiaFacultad: this.copiaFacultad(),
    };
    this.cargando.set(true);
    this.error.set(null);
    this.emision.crear(request).subscribe({
      next: (borrador) => this.aplicarBorrador(borrador, 2),
      error: (error) => this.fallar(error),
    });
  }

  private aplicarBorrador(borrador: BorradorChequera, paso: number): void {
    this.cargando.set(false);
    this.error.set(null);
    this.borrador.set(borrador);
    this.paso.set(paso);
    this.facultadNueva.set(borrador.facultadId);
    this.tipoNueva.set(borrador.tipoChequeraId);
    if (this.facultades().length === 0) {
      this.cargarFacultades();
    }
    this.arancelTipoId.set(borrador.arancelTipoId);
    this.alternativaId.set(borrador.alternativaId);
    this.cursoId.set(borrador.cursoId);
    this.fecha.set(fechaCorta(borrador.fecha) || hoy());
    this.becaPorcentaje.set(Number((borrador.becaPorcentaje ?? 0) * 100));
    this.becaResolucion.set(borrador.becaResolucion ?? '');
    this.becaFecha.set(fechaCorta(borrador.becaFecha) || hoy());
    this.calculaBeca.set(borrador.calculaBeca);
    this.hpum.set(borrador.hpum === 1);
    this.emailPersonal.set(borrador.emailPersonal ?? '');
    this.emailInstitucional.set(borrador.emailInstitucional ?? '');
    this.incluyeBarras.set(borrador.incluyeBarras);
    this.copiaFacultad.set(borrador.copiaFacultad);
    this.claveIdempotencia.set(globalThis.crypto?.randomUUID?.() ?? String(Date.now()));
    const seleccionada = this.cuotaSeleccionada();
    if (seleccionada) {
      const actualizada = borrador.cuotas.find((cuota) => clave(cuota) === clave(seleccionada));
      if (actualizada?.editable) {
        this.seleccionarCuota(actualizada);
      } else {
        this.cuotaSeleccionada.set(null);
      }
    }
  }

  private payload(borrador: BorradorChequera): ActualizarBorradorRequest {
    const seleccionada = this.cuotaSeleccionada();
    return {
      version: borrador.version,
      arancelTipoId: this.arancelTipoId(),
      alternativaId: this.alternativaId(),
      cursoId: this.cursoId(),
      fecha: `${this.fecha()}T00:00:00Z`,
      hpum: this.hpum() ? 1 : 0,
      becaPorcentaje: this.becaPorcentaje() / 100,
      becaResolucion: this.becaResolucion() || null,
      becaFecha: `${this.becaFecha()}T00:00:00Z`,
      becaUserId: borrador.becaUserId,
      calculaBeca: this.calculaBeca(),
      emailPersonal: this.emailPersonal() || null,
      emailInstitucional: this.emailInstitucional() || null,
      incluyeBarras: this.incluyeBarras(),
      copiaFacultad: this.copiaFacultad(),
      cuotas: borrador.cuotas.map((cuota) => this.edicion(cuota, seleccionada)),
    };
  }

  private edicion(cuota: BorradorCuota, seleccionada: BorradorCuota | null): CuotaEdicion {
    const editada = seleccionada !== null && clave(cuota) === clave(seleccionada);
    return {
      productoId: cuota.productoId,
      alternativaId: cuota.alternativaId,
      cuotaId: cuota.cuotaId,
      mes: cuota.mes,
      anio: cuota.anio,
      vencimiento1: iso(editada ? this.editVenc1() : fechaCorta(cuota.vencimiento1)),
      vencimiento2: iso(editada ? this.editVenc2() : fechaCorta(cuota.vencimiento2)),
      vencimiento3: iso(editada ? this.editVenc3() : fechaCorta(cuota.vencimiento3)),
      importe1Borrador: editada ? this.editImporte1() : cuota.importe1Borrador,
      importe2Borrador: editada ? this.editImporte2() : cuota.importe2Borrador,
      importe3Borrador: editada ? this.editImporte3() : cuota.importe3Borrador,
      manual: cuota.manual,
      compensada: cuota.compensada,
      baja: cuota.baja,
    };
  }

  private fallar(error: unknown): void {
    this.cargando.set(false);
    this.error.set(mensaje(error));
  }
}

function clave(cuota: BorradorCuota): string {
  return `${cuota.productoId}.${cuota.alternativaId}.${cuota.cuotaId}`;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function fechaCorta(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 10) : '';
}

function iso(valor: string): string | null {
  return valor ? `${valor}T00:00:00Z` : null;
}

function mensaje(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const cuerpo = error.error;
    if (typeof cuerpo === 'string' && cuerpo.trim().length > 0) {
      return cuerpo;
    }
    if (cuerpo && typeof cuerpo === 'object') {
      const objeto = cuerpo as { mensaje?: string; message?: string };
      if (objeto.mensaje) {
        return objeto.mensaje;
      }
      if (objeto.message) {
        return objeto.message;
      }
    }
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
