import { Component, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { API_URL, APP_ENV_INFO, AppEnvInfo, PermisosService } from '@tesoreria/shared-api';
import { UiShellComponent } from './ui-shell';

@Component({ standalone: true, selector: 'lib-login-stub', template: '' })
class LoginStubComponent {}

const STORED_USER = {
  token: 'test-token',
  userId: 1,
  nombre: 'Ana',
  sede: 'Mendoza',
};

async function createShell(
  envInfo?: AppEnvInfo,
  overrides: Partial<
    Pick<UiShellComponent, 'moduleName' | 'menuSectionLabel' | 'menuItems' | 'logoUrl'>
  > = {},
  extraProviders: Provider[] = [],
): Promise<ComponentFixture<UiShellComponent>> {
  localStorage.setItem('currentUser', JSON.stringify(STORED_USER));
  await TestBed.configureTestingModule({
    imports: [UiShellComponent],
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(),
      { provide: API_URL, useValue: '' },
      ...extraProviders,
      ...(envInfo ? [{ provide: APP_ENV_INFO, useValue: envInfo }] : []),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(UiShellComponent);
  Object.assign(fixture.componentInstance, {
    moduleName: 'Compras',
    menuSectionLabel: 'Consultas',
    menuItems: [
      { label: 'Inicio', path: '/' },
      { label: 'Gastos', path: '/gastos' },
    ],
    ...overrides,
  });
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('UiShellComponent', () => {
  afterEach(() => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('ui-shell:expanded-groups');
  });

  it('renders the brand block with the module name', async () => {
    const { nativeElement } = await createShell();

    expect(nativeElement.textContent).toContain('UM · Tesorería');
    expect(nativeElement.textContent).toContain('Compras');
  });

  it('renders one sidebar link per menu item with the section label', async () => {
    const { nativeElement } = await createShell();
    const sidebar = nativeElement.querySelector('aside');

    expect(sidebar.getAttribute('aria-label')).toBe('Navegación principal');
    expect(sidebar.textContent).toContain('Consultas');
    const links = sidebar.querySelectorAll<HTMLAnchorElement>('nav a');
    expect(links.length).toBe(2);
    expect(links[1].textContent?.trim()).toBe('Gastos');
  });

  it('muestra los hijos de un grupo recién al expandirlo y recuerda el estado', async () => {
    const menuItems = [
      { label: 'Dashboard', path: '/' },
      {
        label: 'Cobranzas',
        path: '/cobranzas',
        children: [
          { label: 'Importar archivos', path: '/cobranzas/importar' },
          { label: 'Carga manual de pago', path: '/cobranzas/pago-manual' },
        ],
      },
    ];
    const fixture = await createShell(undefined, { menuItems });
    const sidebar = fixture.nativeElement.querySelector('aside') as HTMLElement;

    expect(sidebar.querySelectorAll('nav a').length).toBe(2);
    const toggle = sidebar.querySelector<HTMLButtonElement>(
      'button[aria-label="Expandir Cobranzas"]',
    );
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    toggle?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sidebar.querySelectorAll('nav a').length).toBe(4);
    expect(sidebar.textContent).toContain('Importar archivos');
    expect(
      sidebar.querySelector<HTMLButtonElement>('button[aria-label="Contraer Cobranzas"]'),
    ).toBeTruthy();
    expect(localStorage.getItem('ui-shell:expanded-groups')).toContain('/cobranzas');
  });

  // protects=un grupo con soloGrupo no navega: su texto es un botón que despliega los hijos; fails_when=aparece como enlace al path del grupo o no despliega; no_claim=no prueba el menú móvil ni la persistencia (la cubre el caso de grupos comunes)
  it('un grupo soloGrupo se despliega sin navegar', async () => {
    const menuItems = [
      { label: 'Dashboard', path: '/' },
      {
        label: 'Consultas',
        path: '/consultas',
        soloGrupo: true,
        children: [{ label: 'Mayor', path: '/consultas/mayor' }],
      },
    ];
    const fixture = await createShell(undefined, { menuItems });
    const sidebar = fixture.nativeElement.querySelector('aside') as HTMLElement;

    const enlaces = () =>
      Array.from(sidebar.querySelectorAll<HTMLAnchorElement>('nav a')).map((a) =>
        a.textContent?.trim(),
      );
    expect(enlaces()).not.toContain('Consultas');
    const boton = Array.from(sidebar.querySelectorAll<HTMLButtonElement>('nav button')).find((b) =>
      /Consultas/.test(b.textContent ?? ''),
    );
    expect(boton).toBeTruthy();
    expect(boton?.getAttribute('aria-expanded')).toBe('false');

    boton?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(boton?.getAttribute('aria-expanded')).toBe('true');
    expect(enlaces()).toContain('Mayor');
  });

  it('oculta el grupo cuando ningún hijo queda visible por permisos', async () => {
    const fixture = await createShell(
      undefined,
      {
        menuItems: [
          { label: 'Dashboard', path: '/' },
          {
            label: 'Cobranzas',
            path: '/cobranzas',
            children: [
              {
                label: 'Importar archivos',
                path: '/cobranzas/importar',
                permiso: 'chequeras.cobranzas.importar',
              },
            ],
          },
        ],
      },
      [{ provide: PermisosService, useValue: { hasPermiso: () => false } }],
    );
    const sidebar = fixture.nativeElement.querySelector('aside') as HTMLElement;

    expect(sidebar.textContent).not.toContain('Cobranzas');
    expect(sidebar.querySelectorAll('nav a').length).toBe(1);
  });

  it('muestra el grupo y sus hijos cuando el usuario tiene el permiso', async () => {
    const fixture = await createShell(
      undefined,
      {
        menuItems: [
          {
            label: 'Cobranzas',
            path: '/cobranzas',
            children: [
              {
                label: 'Importar archivos',
                path: '/cobranzas/importar',
                permiso: 'chequeras.cobranzas.importar',
              },
            ],
          },
        ],
      },
      [
        {
          provide: PermisosService,
          useValue: { hasPermiso: (clave: string) => clave === 'chequeras.cobranzas.importar' },
        },
      ],
    );
    const sidebar = fixture.nativeElement.querySelector('aside') as HTMLElement;

    expect(sidebar.textContent).toContain('Cobranzas');
    sidebar.querySelector<HTMLButtonElement>('button[aria-label="Expandir Cobranzas"]')?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sidebar.textContent).toContain('Importar archivos');
  });

  it('shows the environment badge with its label and version tooltip', async () => {
    const { nativeElement } = await createShell({ name: 'staging', version: 'abc1234' });
    const badge: HTMLElement = nativeElement.querySelector('aside span[title]');

    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('STAGING');
    expect(badge.getAttribute('title')).toContain('abc1234');
    expect(badge.className).toContain('ring-purple-300');
  });

  it('marks unknown environments in red so misconfigured deploys are visible', async () => {
    const { nativeElement } = await createShell({ name: 'desconocido', version: 'sin-version' });
    const badge: HTMLElement = nativeElement.querySelector('aside span[title]');

    expect(badge.textContent?.trim()).toBe('SIN DEFINIR');
    expect(badge.className).toContain('ring-red-300');
  });

  it('does not render the badge when APP_ENV_INFO is not provided', async () => {
    const { nativeElement } = await createShell();
    const badge = nativeElement.querySelector('aside span[title]');

    expect(badge).toBeNull();
  });

  it('shows the signed-in user name and branch', async () => {
    const { nativeElement } = await createShell();

    expect(nativeElement.textContent).toContain('Ana');
    expect(nativeElement.textContent).toContain('Sede Mendoza');
  });

  it('renders the institutional logo in the brand block when logoUrl is set', async () => {
    const { nativeElement } = await createShell(undefined, { logoUrl: '/logo.png' });
    const logo: HTMLImageElement = nativeElement.querySelector('aside img');

    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toBe('/logo.png');
    expect(logo.getAttribute('alt')).toBe('Universidad de Mendoza');
    expect(nativeElement.querySelector('aside').textContent).not.toContain('UM · Tesorería');
    expect(nativeElement.querySelector('aside').textContent).toContain('Compras');
  });

  it('renders the text brand when no logoUrl is provided', async () => {
    const { nativeElement } = await createShell();

    expect(nativeElement.querySelector('aside img')).toBeNull();
    expect(nativeElement.querySelector('aside').textContent).toContain('UM · Tesorería');
  });

  it('clears the session when logging out from the sidebar', async () => {
    const fixture = await createShell();
    const logout = [...fixture.nativeElement.querySelectorAll('aside button')].find((b) =>
      b.textContent?.includes('Cerrar sesión'),
    ) as HTMLButtonElement;

    logout.click();

    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('renders the bare router outlet when there is no session', async () => {
    localStorage.removeItem('currentUser');
    await TestBed.configureTestingModule({
      imports: [UiShellComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: API_URL, useValue: '' }],
    }).compileComponents();

    const fixture = TestBed.createComponent(UiShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('aside')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('opens and closes the change password modal from the sidebar', async () => {
    const fixture = await createShell();
    const component = fixture.componentInstance;

    expect(component.isCambioClaveOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('#modal-title')).toBeNull();

    const changePasswordBtn = [...fixture.nativeElement.querySelectorAll('aside button')].find(
      (b) => b.textContent?.includes('Cambiar clave'),
    ) as HTMLButtonElement;
    expect(changePasswordBtn).toBeTruthy();

    changePasswordBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCambioClaveOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('#modal-title')?.textContent?.trim()).toBe(
      'Cambiar Clave',
    );

    component.cerrarCambioClave();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCambioClaveOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('#modal-title')).toBeNull();
  });
});
