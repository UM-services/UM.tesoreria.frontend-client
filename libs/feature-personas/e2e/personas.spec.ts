import { expect, test, type Page } from '@playwright/test';
import {
  DOMICILIO_BASE,
  PERSONA_BASE,
  SESION_EXTERNA,
  instalarCoreSimulado,
} from './core-simulado';

/**
 * Suite de la pantalla de Personas (`@tesoreria/feature-personas`). Corre una vez por cada app
 * que la monta (ver `playwright.config.ts`): el nombre del "project" es el de la app.
 */
const ENCABEZADO_POR_APP: Record<string, string> = {
  chequeras: 'Chequeras / Personas',
  contratados: 'Contratados / Personas',
};

/** Mensaje de la pantalla (alertas de éxito, aviso o error). */
const mensaje = (page: Page) => page.locator('.um-alert').first();

/** Busca por apellido, elige la primera coincidencia y espera a que se cargue el domicilio. */
async function cargarPersonaExistente(page: Page): Promise<void> {
  await page.locator('#personas-buscador').fill('perez juan');
  await page.getByRole('option', { name: /PEREZ, Juan/ }).click();
  await expect(page.locator('#personas-calle')).toHaveValue(DOMICILIO_BASE.calle);
}

test.describe('Personas', () => {
  test('carga los datos personales y el domicilio al elegir la persona en el buscador', async ({
    page,
  }) => {
    await instalarCoreSimulado(page);
    await page.goto('/personas');

    await cargarPersonaExistente(page);

    await expect(page.locator('#personas-id')).toHaveValue(String(PERSONA_BASE.personaId));
    await expect(page.locator('#personas-id')).toBeDisabled();
    await expect(page.locator('#personas-apellido')).toHaveValue('PEREZ');
    await expect(page.locator('#personas-nombre')).toHaveValue('Juan');
    await expect(page.getByRole('radio', { name: 'Masculino' })).toBeChecked();
    await expect(page.locator('#personas-puerta')).toHaveValue('345');
    await expect(page.locator('#personas-provincia option:checked')).toHaveText('Mendoza');
    await expect(page.locator('#personas-localidad option:checked')).toHaveText('Godoy Cruz');
    await expect(page.locator('.um-alert-error')).toHaveCount(0);
  });

  test('da de alta una persona nueva con su domicilio', async ({ page }) => {
    const core = await instalarCoreSimulado(page);
    await page.goto('/personas');

    await page.locator('#personas-id').fill('87654321');
    await page.locator('#personas-documento').selectOption({ label: 'DNI' });
    await page.locator('#personas-apellido').fill('Gomez');
    await page.locator('#personas-nombre').fill('Ana');
    await page.getByRole('radio', { name: 'Femenino' }).check();
    await page.locator('#personas-calle').fill('San Martín');
    await page.locator('#personas-puerta').fill('100');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(mensaje(page)).toContainText('Persona y domicilio guardados.');

    const altaPersona = core.escrituras('POST', '/persona');
    expect(altaPersona).toHaveLength(1);
    expect(altaPersona[0]?.cuerpo).toMatchObject({
      personaId: 87654321,
      documentoId: 1,
      apellido: 'Gomez',
      nombre: 'Ana',
      sexo: 'F',
    });
    const altaDomicilio = core.escrituras('POST', '/domicilio');
    expect(altaDomicilio).toHaveLength(1);
    expect(altaDomicilio[0]?.cuerpo).toMatchObject({
      personaId: 87654321,
      documentoId: 1,
      calle: 'San Martín',
      puerta: '100',
      facultadId: 6,
    });
  });

  test('no guarda y avisa cuando faltan datos obligatorios', async ({ page }) => {
    const core = await instalarCoreSimulado(page);
    await page.goto('/personas');

    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(mensaje(page)).toContainText('Complete número, tipo de documento');
    expect(core.escrituras('POST', '/persona')).toHaveLength(0);
    expect(core.escrituras('PUT', '/persona')).toHaveLength(0);
  });

  test('al editar solo el domicilio conserva los campos de la persona que la pantalla no maneja', async ({
    page,
  }) => {
    const core = await instalarCoreSimulado(page);
    await page.goto('/personas');
    await cargarPersonaExistente(page);

    await page.locator('#personas-calle').fill('Belgrano');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(mensaje(page)).toContainText('Persona y domicilio guardados.');

    const putPersona = core.escrituras('PUT', '/persona/');
    expect(putPersona).toHaveLength(1);
    expect(putPersona[0]?.cuerpo).toMatchObject({
      uniqueId: PERSONA_BASE.uniqueId,
      password: PERSONA_BASE.password,
      hpum: PERSONA_BASE.hpum,
      primero: PERSONA_BASE.primero,
      numeroPrefijo: PERSONA_BASE.numeroPrefijo,
      numeroPosfijo: PERSONA_BASE.numeroPosfijo,
      guaraniPersona: PERSONA_BASE.guaraniPersona,
    });

    const putDomicilio = core.escrituras('PUT', '/domicilio/');
    expect(putDomicilio).toHaveLength(1);
    expect(putDomicilio[0]?.ruta).toBe(`/domicilio/${DOMICILIO_BASE.domicilioId}`);
    expect(putDomicilio[0]?.cuerpo).toMatchObject({
      calle: 'Belgrano',
      fecha: DOMICILIO_BASE.fecha,
      domicilioId: DOMICILIO_BASE.domicilioId,
    });
  });

  test('si no se toca el domicilio, guarda solo la persona', async ({ page }) => {
    const core = await instalarCoreSimulado(page);
    await page.goto('/personas');
    await cargarPersonaExistente(page);

    await page.locator('#personas-nombre').fill('Juan Carlos');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(mensaje(page)).toContainText('Persona guardada.');
    expect(core.escrituras('PUT', '/persona/')).toHaveLength(1);
    expect(core.escrituras('PUT', '/domicilio/')).toHaveLength(0);
    expect(core.escrituras('POST', '/domicilio')).toHaveLength(0);
  });

  test.describe('código postal', () => {
    test('completa provincia, localidad y observaciones desde el maestro', async ({ page }) => {
      await instalarCoreSimulado(page);
      await page.goto('/personas');

      await page.locator('#personas-cp').fill('5500');
      await page.locator('#personas-cp').blur();

      await expect(page.locator('#personas-provincia option:checked')).toHaveText('Mendoza');
      await expect(page.locator('#personas-localidad option:checked')).toHaveText('Capital');
      await expect(page.locator('#personas-observaciones')).toHaveValue('Capital');
    });

    test('avisa y no inventa la provincia cuando no está en el maestro', async ({ page }) => {
      await instalarCoreSimulado(page);
      await page.goto('/personas');

      await page.locator('#personas-cp').fill('4000');
      await page.locator('#personas-cp').blur();

      await expect(page.getByText('Tucumán', { exact: false })).toBeVisible();
      await expect(page.locator('#personas-provincia option:checked')).toHaveText('Seleccione...');
    });
  });

  test.describe('recuperar CBU', () => {
    test('propone el CBU de la última factura y lo guarda al confirmar', async ({ page }) => {
      const core = await instalarCoreSimulado(page);
      await page.goto('/personas');
      await cargarPersonaExistente(page);

      await page.getByRole('button', { name: 'Recuperar CBU' }).click();
      await expect(page.getByText('0170000000000000000001')).toBeVisible();
      await page.getByRole('button', { name: 'Sí, guardar' }).click();

      await expect(mensaje(page)).toContainText('CBU actualizado.');
      await expect(page.locator('#personas-cbu')).toHaveValue('0170000000000000000001');
      const putPersona = core.escrituras('PUT', '/persona/');
      expect(putPersona).toHaveLength(1);
      expect(putPersona[0]?.cuerpo).toMatchObject({
        cbu: '0170000000000000000001',
        password: PERSONA_BASE.password,
      });
    });

    test('no propone un CBU que no tiene 22 caracteres', async ({ page }) => {
      const core = await instalarCoreSimulado(page);
      core.datos.cbuContrato['12345678.1'] = '017000000000000000001';
      await page.goto('/personas');
      await cargarPersonaExistente(page);

      await page.getByRole('button', { name: 'Recuperar CBU' }).click();

      await expect(mensaje(page)).toContainText('no tiene un CBU de 22 caracteres');
      await expect(page.getByRole('button', { name: 'Sí, guardar' })).toHaveCount(0);
      expect(core.escrituras('PUT', '/persona/')).toHaveLength(0);
    });
  });

  test.describe('integración con la app', () => {
    test('el encabezado muestra el texto que la app define en la ruta', async ({
      page,
    }, testInfo) => {
      await instalarCoreSimulado(page);
      await page.goto('/personas');

      await expect(page.locator('.um-eyebrow')).toHaveText(
        ENCABEZADO_POR_APP[testInfo.project.name] ?? '',
      );
    });

    test('el menú de la app tiene el ítem Personas y lleva a la pantalla', async ({ page }) => {
      await instalarCoreSimulado(page);
      await page.goto('/');

      await page.getByRole('link', { name: 'Personas' }).click();

      await expect(page).toHaveURL(/\/personas$/);
      await expect(page.getByRole('heading', { name: 'Personas', level: 1 })).toBeVisible();
    });
  });

  test.describe('acceso', () => {
    test('un usuario externo no entra a Personas', async ({ page }) => {
      await instalarCoreSimulado(page, { sesion: SESION_EXTERNA });

      await page.goto('/personas');

      await expect(page).toHaveURL(/\/sin-acceso/);
    });

    test('sin sesión redirige al login', async ({ page }) => {
      await instalarCoreSimulado(page, { sesion: null });

      await page.goto('/personas');

      await expect(page).toHaveURL(/\/login/);
    });
  });
});