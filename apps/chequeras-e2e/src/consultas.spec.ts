import { expect, test } from '@playwright/test';

// Smoke de rutas de Consultas: sin sesión, la pantalla existe y queda detrás del guard de
// acceso, con el `returnUrl` intacto. No requiere backend.
const rutas = ['/consultas', '/consultas/detalle-cuotas'];

for (const ruta of rutas) {
  test(`without a session ${ruta} redirects to login`, async ({ page }) => {
    await page.goto(ruta);

    await expect(page).toHaveURL(/\/login/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toContain(ruta);
  });
}

test('unknown consulta paths fall back to the consultas home', async ({ page }) => {
  await page.goto('/consultas/no-existe');

  await expect(page).toHaveURL(/\/login/);
  expect(new URL(page.url()).searchParams.get('returnUrl')).toContain('/consultas');
});
