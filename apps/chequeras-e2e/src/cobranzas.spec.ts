import { expect, test } from '@playwright/test';

// Smoke de rutas de Cobranzas: sin sesión, cada pantalla nueva existe y queda detrás del
// guard de acceso, con el `returnUrl` intacto. No requiere backend.
const rutas = [
  '/cobranzas',
  '/cobranzas/importar',
  '/cobranzas/importaciones',
  '/cobranzas/generar',
  '/cobranzas/pago-manual',
  '/cobranzas/baja',
];

for (const ruta of rutas) {
  test(`without a session ${ruta} redirects to login`, async ({ page }) => {
    await page.goto(ruta);

    await expect(page).toHaveURL(/\/login/);
    expect(new URL(page.url()).searchParams.get('returnUrl')).toContain(ruta);
  });
}

test('unknown cobranza paths fall back to the cobranzas home', async ({ page }) => {
  await page.goto('/cobranzas/no-existe');

  await expect(page).toHaveURL(/\/login/);
  expect(new URL(page.url()).searchParams.get('returnUrl')).toContain('/cobranzas');
});
