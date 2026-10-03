import { expect, test } from '@playwright/test';

// Smoke de acceso: sin sesión, el guard redirige al login y el formulario
// se renderiza sin necesidad de backend (las llamadas HTTP recién ocurren
// al enviar las credenciales).
test('without a session the app lands on the login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login/);
});

test('the login form renders user and password fields', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('form input[type="text"]')).toBeVisible();
  await expect(page.locator('form input[type="password"]')).toBeVisible();
});
