import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { API_URL, APP_ENV_INFO, AppEnvInfo } from '@tesoreria/shared-api';
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
): Promise<ComponentFixture<UiShellComponent>> {
  localStorage.setItem('currentUser', JSON.stringify(STORED_USER));
  await TestBed.configureTestingModule({
    imports: [UiShellComponent],
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(),
      { provide: API_URL, useValue: '' },
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

    const changePasswordBtn = [...fixture.nativeElement.querySelectorAll('aside button')].find((b) =>
      b.textContent?.includes('Cambiar clave'),
    ) as HTMLButtonElement;
    expect(changePasswordBtn).toBeTruthy();

    changePasswordBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCambioClaveOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('#modal-title')?.textContent?.trim()).toBe('Cambiar Clave');

    component.cerrarCambioClave();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCambioClaveOpen()).toBe(false);
    expect(fixture.nativeElement.querySelector('#modal-title')).toBeNull();
  });
});

