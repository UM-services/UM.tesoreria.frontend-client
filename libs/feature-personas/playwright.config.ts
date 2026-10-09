import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

/**
 * E2E de la pantalla de Personas. La librería se monta en más de una app, así que la misma suite
 * (e2e/personas.spec.ts) corre una vez por app: cada app es un "project" de Playwright.
 *
 * Dónde corre (variable `E2E_TARGET`):
 * - `dev` (por defecto): levanta `nx serve <app>` en el puerto de desarrollo de AGENTS.md. Si el
 *   puerto ya está ocupado falla con un mensaje claro, en lugar de probar otra cosa sin avisar.
 * - `docker`: usa los contenedores del docker-compose local (HTTPS con certificado autofirmado,
 *   build de producción). No levanta nada: los contenedores tienen que estar arriba y con la
 *   imagen reconstruida (`docker compose up -d --build tesoreria-<app>-client`).
 *
 * Otras variables:
 * - `E2E_APPS=chequeras` (o `contratados`) limita la corrida a una app.
 * - `BASE_URL` apunta a cualquier otra instancia ya levantada; sólo con una única app.
 *
 * El core está simulado en el navegador, así que no hace falta backend en ninguno de los modos.
 */
const APPS: Record<string, { dev: number; docker: number }> = {
  chequeras: { dev: 4203, docker: 4202 },
  contratados: { dev: 4206, docker: 4204 },
};

const modo = process.env['E2E_TARGET'] === 'docker' ? 'docker' : 'dev';

const seleccionadas = (process.env['E2E_APPS'] ?? Object.keys(APPS).join(','))
  .split(',')
  .map((app) => app.trim())
  .filter((app) => app in APPS);

if (seleccionadas.length === 0) {
  throw new Error(
    `E2E_APPS no tiene ninguna app válida. Opciones: ${Object.keys(APPS).join(', ')}`,
  );
}

const baseUrlExterna = process.env['BASE_URL'];
if (baseUrlExterna && seleccionadas.length > 1) {
  throw new Error('BASE_URL sólo se puede usar con una app: definir también E2E_APPS=<app>.');
}

const urlDe = (app: string): string =>
  baseUrlExterna ??
  (modo === 'docker'
    ? `https://localhost:${APPS[app]?.docker}`
    : `http://localhost:${APPS[app]?.dev}`);

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './e2e' }),
  use: {
    // Los contenedores locales sirven con un certificado autofirmado.
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  webServer:
    baseUrlExterna || modo === 'docker'
      ? undefined
      : seleccionadas.map((app) => ({
          command: `npx nx serve ${app} --port ${APPS[app]?.dev}`,
          url: `http://localhost:${APPS[app]?.dev}`,
          reuseExistingServer: false,
          cwd: workspaceRoot,
          timeout: 180_000,
        })),
  projects: seleccionadas.map((app) => ({
    name: app,
    use: { ...devices['Desktop Chrome'], baseURL: urlDe(app) },
  })),
});