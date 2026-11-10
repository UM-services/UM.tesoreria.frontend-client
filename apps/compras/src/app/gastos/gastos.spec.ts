import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { API_URL } from '@tesoreria/shared-api';

type Comp = import('@tesoreria/feature-gastos').GastosComponent;

describe('GastosComponent', () => {
  let component: Comp;
  let fixture: ComponentFixture<Comp>;
  let http: HttpTestingController;
  const base = '/api/tesoreria/compras/articulo';
  const paginaVacia = { data: [], totalElements: 0, totalPages: 0, currentPage: 0, pageSize: 10 };

  const gastoGuardado = {
    articuloId: 48,
    nombre: 'Fotocopias',
    descripcion: 'Viejo',
    unidad: 'UN',
    precio: 10.5,
    inventariable: 0,
    stockMinimo: 0,
    numeroCuenta: 10101010001,
    tipo: 'gasto',
    directo: 0,
    habilitado: 1,
  };

  beforeEach(async () => {
    const { GastosComponent } = await import('@tesoreria/feature-gastos');

    await TestBed.configureTestingModule({
      imports: [GastosComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GastosComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(`${base}/tipo/gasto/page`).flush(paginaVacia);
    http.expectOne('/api/tesoreria/compras/ubicacion/').flush([]);
  });

  afterEach(() => http.verify());

  function abrirAlta(id = 465) {
    component.abrirModal();
    http.expectOne(`${base}/new`).flush({ ...gastoGuardado, articuloId: id, nombre: '' });
  }

  function abrirEdicion() {
    component.abrirModal(gastoGuardado);
    http.expectOne('/api/tesoreria/compras/ubicacionArticulo/articulo/48').flush([]);
  }

  const conflicto = { detail: 'La operación sobre el artículo choca con otro dato.' };

  it('un 403 al cargar la lista no muestra aviso propio (lo muestra la franja del shell)', () => {
    component.loadGastos(0);
    http.expectOne(`${base}/tipo/gasto/page`).flush({}, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage).toBe('');
    expect(component.gastos).toEqual([]);
  });

  it('otro error al cargar la lista avisa error de conexión', () => {
    component.loadGastos(0);
    http.expectOne(`${base}/tipo/gasto/page`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.errorMessage).toBe('Error de conexión con el servidor.');
  });

  it('una búsqueda cancela la página que todavía no llegó', () => {
    component.loadGastos(0);
    const pagina = http.expectOne(`${base}/tipo/gasto/page`);
    component.buscarGastos('Telefono');
    expect(pagina.cancelled).toBe(true);
    http
      .expectOne(`${base}/search`)
      .flush([{ ...gastoGuardado, articuloId: 22, nombre: 'Telefono' }]);
    expect(component.gastos.map((g) => g.articuloId)).toEqual([22]);
  });

  it('cargar la página cancela la búsqueda que todavía no llegó', () => {
    component.buscarGastos('Telefono');
    const busqueda = http.expectOne(`${base}/search`);
    component.loadGastos(0);
    expect(busqueda.cancelled).toBe(true);
    http.expectOne(`${base}/tipo/gasto/page`).flush({ ...paginaVacia, data: [gastoGuardado] });
    expect(component.gastos.map((g) => g.articuloId)).toEqual([48]);
  });

  it('alta sin cuenta: manda null, tipo gasto y habilitado 1', () => {
    abrirAlta();
    component.gastoForm.patchValue({ nombre: '  Fotocopias  ' });
    component.guardar();
    const req = http.expectOne(`${base}/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({
      articuloId: 465,
      nombre: 'Fotocopias',
      numeroCuenta: null,
      tipo: 'gasto',
      directo: 0,
      habilitado: 1,
    });
    req.flush({ ...gastoGuardado, articuloId: 465 });
    http.expectOne(`${base}/tipo/gasto/page`).flush(paginaVacia);
    expect(component.isModalOpen).toBe(false);
  });

  it('no guarda si falta el nombre (también con sólo espacios), como frmGasto', () => {
    abrirAlta();
    component.gastoForm.patchValue({ nombre: '   ' });
    component.guardar();
    http.expectNone(`${base}/`);
    expect(component.modalAviso).toEqual({ tipo: 'error', texto: 'Falta el nombre del gasto.' });
  });

  it('edición: el PUT manda sólo lo que muestra la pantalla (no pisa precio, unidad ni habilitado)', () => {
    abrirEdicion();
    component.gastoForm.patchValue({ nombre: 'Fotocopias color', directo: true });
    component.guardar();
    const req = http.expectOne(`${base}/48`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      nombre: 'Fotocopias color',
      numeroCuenta: 10101010001,
      directo: 1,
      tipo: 'gasto',
    });
    req.flush(gastoGuardado);
    http.expectOne(`${base}/tipo/gasto/page`).flush(paginaVacia);
    expect(component.successMessage).toBe('Gasto N.º 48 «Fotocopias color» guardado.');
  });

  it('edición con la cuenta vaciada: avisa y no llama a la API', () => {
    abrirEdicion();
    component.gastoForm.patchValue({ numeroCuenta: null });
    component.guardar();
    http.expectNone(`${base}/48`);
    expect(component.modalAviso).toEqual({
      tipo: 'error',
      texto: 'La cuenta no se puede quitar; elija otra o deje la actual.',
    });
  });

  describe('alta con 409', () => {
    function guardarCon409() {
      abrirAlta(465);
      component.gastoForm.patchValue({ nombre: 'Fotocopias', numeroCuenta: 10101010001 });
      component.guardar();
      http.expectOne(`${base}/`).flush(conflicto, { status: 409, statusText: 'Conflict' });
      expect(component.estadoGuardado).toBe('comprobando');
      return http.expectOne({ method: 'GET', url: `${base}/465` });
    }

    it('el número tiene el mismo gasto: lo toma como guardado y no pide otro número', () => {
      guardarCon409().flush({ ...gastoGuardado, articuloId: 465 });
      http.expectNone(`${base}/new`);
      http.expectOne(`${base}/tipo/gasto/page`).flush(paginaVacia);
      expect(component.isModalOpen).toBe(false);
      expect(component.successMessage).toBe('El gasto N.º 465 ya estaba guardado.');
    });

    it('el número es de otro gasto: pide otro con /new y conserva lo cargado', () => {
      guardarCon409().flush({ ...gastoGuardado, articuloId: 465, nombre: 'Otro gasto' });
      http.expectOne(`${base}/new`).flush({ ...gastoGuardado, articuloId: 466, nombre: '' });
      expect(component.gastoForm.getRawValue().articuloId).toBe(466);
      expect(component.gastoForm.getRawValue().nombre).toBe('Fotocopias');
      expect(component.isModalOpen).toBe(true);
      expect(component.isSaving).toBe(false);
      expect(component.modalAviso).toEqual({
        tipo: 'warn',
        texto:
          'El número 465 ya lo usa otro gasto. Se asignó el 466; revise los datos y vuelva a guardar.',
      });
    });

    it('la lectura falla: conserva el número y no pide otro', () => {
      guardarCon409().flush(null, { status: 503, statusText: 'Service Unavailable' });
      http.expectNone(`${base}/new`);
      expect(component.gastoForm.getRawValue().articuloId).toBe(465);
      expect(component.isModalOpen).toBe(true);
      expect(component.modalAviso).toEqual({
        tipo: 'warn',
        texto: 'No se pudo confirmar si el gasto quedó guardado; vuelva a intentar.',
      });
    });
  });

  it('error al guardar: muestra el detail de la respuesta dentro del modal, fuera del cuerpo con scroll', () => {
    abrirAlta();
    component.gastoForm.patchValue({ nombre: 'Fotocopias', numeroCuenta: 99999999998 });
    component.guardar();
    http
      .expectOne(`${base}/`)
      .flush(
        { detail: 'El artículo enviado no es válido.' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    const dialogo: HTMLElement = fixture.nativeElement.querySelector('[role="dialog"]');
    const aviso = dialogo.querySelector('[role="alert"]');
    expect(aviso?.textContent?.trim()).toBe('El artículo enviado no es válido.');
    expect(aviso?.classList).toContain('um-alert-error');
    const cuerpoConScroll = dialogo.querySelector('form')?.parentElement;
    expect(cuerpoConScroll?.contains(aviso)).toBe(false);
    expect(component.errorMessage).toBe('');
  });

  it('no cierra el modal mientras guarda', () => {
    abrirAlta();
    component.gastoForm.patchValue({ nombre: 'Fotocopias' });
    component.guardar();
    fixture.detectChanges();
    component.cerrarModal();
    expect(component.isModalOpen).toBe(true);
    const botones = [
      ...fixture.nativeElement.querySelectorAll('[role="dialog"] button'),
    ] as HTMLButtonElement[];
    const guardar = botones.find((b) => b.textContent?.includes('Guardando…'));
    const cancelar = botones.find((b) => b.textContent?.trim() === 'Cancelar');
    expect(guardar?.disabled).toBe(true);
    expect(cancelar?.disabled).toBe(true);
    http.expectOne(`${base}/`).flush({ ...gastoGuardado, articuloId: 465 });
    http.expectOne(`${base}/tipo/gasto/page`).flush(paginaVacia);
    expect(component.isModalOpen).toBe(false);
  });

  describe('límite de 30 s', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('en el alta conserva el número y avisa que no se pudo confirmar', () => {
      abrirAlta(465);
      component.gastoForm.patchValue({ nombre: 'Fotocopias' });
      component.guardar();
      const req = http.expectOne(`${base}/`);
      vi.advanceTimersByTime(30_000);
      expect(req.cancelled).toBe(true);
      expect(component.isSaving).toBe(false);
      expect(component.gastoForm.getRawValue().articuloId).toBe(465);
      expect(component.modalAviso?.tipo).toBe('warn');
    });

    it('en la edición avisa que el servidor no respondió', () => {
      abrirEdicion();
      component.guardar();
      const req = http.expectOne(`${base}/48`);
      vi.advanceTimersByTime(30_000);
      expect(req.cancelled).toBe(true);
      expect(component.modalAviso).toEqual({
        tipo: 'error',
        texto: 'El servidor no respondió; vuelva a intentar.',
      });
    });
  });

  it('baja con 409: muestra el motivo y no la da por exitosa', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.eliminar(gastoGuardado);
    http
      .expectOne(`${base}/48`)
      .flush(
        { detail: 'La operación sobre el artículo choca con otro dato.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(component.errorMessage).toBe('La operación sobre el artículo choca con otro dato.');
    expect(component.successMessage).toBe('');
  });

  it('no asigna ubicación a un gasto que todavía no se guardó', () => {
    abrirAlta();
    component.selectedUbicacionId = 1;
    component.selectedImputacionCuenta = { numeroCuenta: 10101010001, nombre: 'Fondo Fijo' };
    component.asignarUbicacion();
    http.expectNone('/api/tesoreria/compras/ubicacionArticulo/');
    expect(component.modalAviso).toEqual({
      tipo: 'error',
      texto: 'Guarde el gasto antes de asignarle ubicaciones.',
    });
  });

  it('error al asignar: muestra el detail dentro del modal', () => {
    abrirEdicion();
    component.selectedUbicacionId = 1;
    component.selectedImputacionCuenta = { numeroCuenta: 10101010001, nombre: 'Fondo Fijo' };
    component.asignarUbicacion();
    http
      .expectOne('/api/tesoreria/compras/ubicacionArticulo/')
      .flush(
        { detail: 'La asignación de imputación no es válida.' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(component.isAsignando).toBe(false);
    expect(component.modalAviso).toEqual({
      tipo: 'error',
      texto: 'La asignación de imputación no es válida.',
    });
  });
});
