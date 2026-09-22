import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { API_URL, APP_ENV_INFO, AppEnvInfo } from '@tesoreria/shared-api';
import { NavbarComponent } from './navbar';

const STORED_USER = {
  token: 'test-token',
  userId: 1,
  nombre: 'Ana',
  sede: 'Mendoza'
};

async function createNavbar(envInfo?: AppEnvInfo): Promise<ComponentFixture<NavbarComponent>> {
  localStorage.setItem('currentUser', JSON.stringify(STORED_USER));
  await TestBed.configureTestingModule({
    imports: [NavbarComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: API_URL, useValue: '' },
      ...(envInfo ? [{ provide: APP_ENV_INFO, useValue: envInfo }] : [])
    ]
  }).compileComponents();

  const fixture = TestBed.createComponent(NavbarComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('NavbarComponent', () => {
  afterEach(() => {
    localStorage.removeItem('currentUser');
  });

  it('should create', async () => {
    const fixture = await createNavbar();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the environment badge with the mapped label', async () => {
    const fixture = await createNavbar({ name: 'staging', version: 'abc1234' });
    const badge: HTMLElement = fixture.nativeElement.querySelector('span[title]');

    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('STAGING');
    expect(badge.className).toContain('ring-purple-300');
  });

  it('exposes the injected version in the badge tooltip', async () => {
    const fixture = await createNavbar({ name: 'production', version: 'deadbeef' });
    const badge: HTMLElement = fixture.nativeElement.querySelector('span[title]');

    expect(badge.getAttribute('title')).toContain('deadbeef');
    expect(badge.textContent?.trim()).toBe('PRODUCCIÓN');
  });

  it('marks unknown environments in red so misconfigured deploys are visible', async () => {
    const fixture = await createNavbar({ name: 'desconocido', version: 'sin-version' });
    const badge: HTMLElement = fixture.nativeElement.querySelector('span[title]');

    expect(badge.textContent?.trim()).toBe('SIN DEFINIR');
    expect(badge.className).toContain('ring-red-300');
  });

  it('does not render the badge when APP_ENV_INFO is not provided', async () => {
    const fixture = await createNavbar();
    const badge: HTMLElement = fixture.nativeElement.querySelector('span[title]');

    expect(badge).toBeFalsy();
  });
});
