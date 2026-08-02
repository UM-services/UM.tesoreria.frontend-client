# Repository Instructions

## Workspace

- This is an Nx monorepo using Angular 21, TypeScript 5.9, Vitest 4, and npm 11.6.2; use Node.js 20+.
- Install from the lockfile with `npm ci` (the CI workflows currently use `npm install`); do not use another package manager.
- Applications live under `apps/`: `compras`, `pagos`, `chequeras`, `administrador`, `contable`, `contratados`, and `guarani`.
- Shared libraries live under `libs/`: `shared-api`, `ui-auth/ui-auth`, `ui-layout`, `feature-proveedores`, `feature-gastos`, and `feature-orden-compra`.
- Use the configured `@tesoreria/*` path aliases for shared libraries. Nx ESLint enforces module boundaries and buildable-library dependency rules.
- `apps/compras-e2e` and `apps/chequeras-e2e` are Playwright projects; their generated `e2e` targets start the corresponding app server.

## Commands

- Run one app with `npx nx serve <app>`; configured ports are compras 4201, pagos 4202, chequeras 4203, administrador 4204, contable 4205, contratados 4206, and guarani 4207.
- Run all local app servers with `npm run serve:all`.
- Build one project with `npx nx build <project>` or all projects with `npx nx run-many -t build`.
- Lint one project with `npx nx run <project>:lint` or all lint targets with `npx nx run-many -t lint`.
- Test one project with `npx nx test <project>` or all test targets with `npx nx run-many -t test`; use `npx nx show project <project>` to inspect available targets.
- Run E2E with `npx nx e2e compras-e2e` or `npx nx e2e chequeras-e2e`; set `BASE_URL` to test an already deployed app.
- Format uses Prettier with 100-column width, single quotes, and Angular parsing for HTML; repository indentation is two spaces.

## Verification And Deployment

- TypeScript and Angular template checking are strict (`strict`, `strictTemplates`, strict injection parameters); preserve those checks rather than loosening compiler options.
- Production builds enforce initial bundle limits of 500 kB warning / 1 MB error and component-style limits of 4 kB warning / 8 kB error.
- Docker publishing covers only `administrador`, `chequeras`, `compras`, `contable`, `contratados`, and `pagos` on pushes to `main`; each image uses `apps/<app>/Dockerfile`.
- The docs workflow runs on pushes to `main` or `master`, generates an Nx graph and dashboard, and deploys GitHub Pages; generated `docs-site`, `dist`, and Nx/Angular caches are not source files.
