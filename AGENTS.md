# Repository Instructions

## Workspace

- This is an Nx 22.7.1 monorepo using Angular 21, TypeScript 5.9, Vitest 4, and npm 11.6.2; use Node.js 20+.
- Install from the lockfile with `npm ci`; do not use another package manager.
- Applications live under `apps/`: `compras`, `pagos`, `chequeras`, `administrador`, `contable`, `contratados`, `guarani`, and `externo-consulta`. Apps are thin shells: root component with `<ui-shell>`, `app.config.ts`, and `app.routes.ts` only. Feature views never live inside `apps/<app>/src/app/`.
- Shared libraries live under `libs/`: `shared-api`, `ui-auth`, `ui-layout`, `feature-proveedores`, `feature-gastos`, `feature-pedido-compra`, `feature-guarani`, and `feature-externo-consulta`. Each app's views belong in its feature libraries, which export their routes (`lib.routes.ts`, e.g. `GUARANI_ROUTES`) and are mounted with `loadChildren`/`loadComponent`.
- Libraries must not import `apps/**/environments/*`; anything configuration-driven (API bases, debug flags) comes through injection tokens (`API_URL`, `EXTERNO_API_BASE`, `EXTERNO_ENABLE_DEBUG` in `@tesoreria/shared-api`) provided by the host app's `app.config.ts`. Because feature libs are lazy-loaded, `@nx/enforce-module-boundaries` forbids statically importing them anywhere else than route loaders.
- Use the configured `@tesoreria/*` path aliases for shared libraries and import public symbols through each library's `src/index.ts`. Nx ESLint enforces module boundaries using project tags (`type:*` and `scope:*`) and dependency direction rules.
- `apps/compras-e2e` and `apps/chequeras-e2e` are Playwright projects; their generated `e2e` targets start the corresponding app server.

## Commands

- Run one app with `npx nx serve <app>`; configured ports are compras 4201, pagos 4202, chequeras 4203, administrador 4204, contable 4205, contratados 4206, guarani 4207, and externo-consulta 4208.
- Run all local app servers with `npm run serve:all`.
- Build one project with `npx nx build <project>` or all projects with `npx nx run-many -t build`.
- Lint one project with `npx nx run <project>:lint` or all lint targets with `npx nx run-many -t lint`.
- Test one project with `npx nx test <project>` or all test targets with `npx nx run-many -t test`; use `npx nx show project <project>` to inspect available targets.
- Run E2E with `npx nx e2e compras-e2e` or `npx nx e2e chequeras-e2e`; set `BASE_URL` to test an already deployed app.
- Format uses Prettier with 100-column width, single quotes, and Angular parsing for HTML; repository indentation is two spaces.
- Routes use standalone `loadComponent` lazy loading for shared login and feature components where configured; preserve this instead of reintroducing eager imports.
- UI design follows the shared J2 theme: tokens and component utilities live in `libs/ui-layout/src/styles/tokens.css`, every app shell is `@tesoreria/ui-layout`'s `<ui-shell>`, and views use `um-*` classes (`.um-input`, `.um-btn-primary`, `.um-table`, ...) instead of ad-hoc palettes or one-off class strings.
- **Prototypes are content references, never UI references.** HTML prototypes (e.g. `superprogramawebdecompras/`) define *what data* a screen needs, not *how it looks*. Never copy their markup, styles or layout. Build every view with the design system: `um-page-header`/`um-eyebrow`/`um-page-title`/`um-page-desc`, `um-card`, `um-section`, `um-label`/`um-input`, `um-btn-primary`/`um-btn-secondary`/`um-link-btn`, `um-alert`/`um-alert-error|warn|success`, `um-table`, `um-badge`, plus the `@tesoreria/ui-layout` widgets (search components). Use `feature-proveedores` and `feature-gastos` as structural references.

## Verification And Deployment

- TypeScript and Angular template checking are strict (`strict`, `strictTemplates`, strict injection parameters); preserve those checks rather than loosening compiler options.
- Production builds enforce initial bundle limits of 500 kB warning / 1 MB error and component-style limits of 4 kB warning / 8 kB error.
- All applications, including `guarani` and `externo-consulta`, build from the shared multistage `docker/app.Dockerfile` with `--build-arg APP=<app>`: the Node stage runs `npm ci` and `npx nx build <app> --configuration=production`, and the Nginx stage copies that build. Images depend only on source, never on a local `dist/apps/`, so do not reintroduce runtime-only Dockerfiles that `COPY dist/`. Keep `node_modules`, `dist`, `.angular`, `.nx` and `.git` out of the build context in `.dockerignore`. Rebuilding through Compose requires `--build` (or `npm run docker:app -- <app>`) because `up -d` reuses an existing image without looking at the source.
- CI criteria (shared with um.haberes.frontend-client): PRs to `main` run affected lint/test/build via `ci.yml`; `develop`/`staging` and `main` flows run through the reusable `.github/workflows/deploy-pipeline.yml`, whose thin callers (`deploy-develop.yml`, `deploy-staging.yml`, `docker-publish.yml`) pass `apps`, `environment`, `deploy`, `deployRunner`/`deployScript`, and `publishLatest`. On PRs the full `nx build` in the verify job is the pre-merge compile check; on pushes it is omitted because the multistage image build already compiles every app. Image tags: full commit sha on every push, plus `latest` only for main.
- Each app registers the shared `authInterceptor` and `errorInterceptor`: authenticated API requests receive a bearer token, while HTTP 401/403 responses clear the session and navigate to `/login`.
- The docs workflow runs on pushes to `main` or `master`, generates an Nx graph and dashboard, and deploys GitHub Pages; generated `docs-site`, `dist`, and Nx/Angular caches are not source files.

## Standard Search Components (Buscadores Compartidos)

- Every screen that looks up a person, provider, or accounting account MUST reuse the shared widgets from `@tesoreria/ui-layout`: `<ui-buscador-persona>` (with `persona-busqueda` helpers), `<ui-buscador-proveedor>`, and `<ui-buscador-cuenta-contable>`. Do not re-implement search pipelines (debounce/keyboard/dropdown wiring) inside feature libraries or apps, and do not add persona/proveedor/account search methods to feature services.
- Exact-key lookups (legajo/DNI) belong in their own editable form fields firing on ENTER and blur, not inside the search widget. Exception: the external portal's person search (`feature-externo-consulta`) queries by assigned-faculty semantics via its own `ChequerasService`; keep that backend contract as-is and route its UI through the shared `BuscadorPersonaComponent`.

## Rich Text Editors (Texto Enriquecido)

- **Convention:** any view that needs **rich/long-form text** (specifications, descriptions, notes, observations, etc.) MUST use the shared WYSIWYG editor **`<ui-editor-enriquecido>`** from `@tesoreria/ui-rich-text` (Quill 2 via `ngx-quill@31`) instead of ad-hoc `<textarea>`, `contenteditable`, or a hand-rolled Markdown editor. Do not re-implement toolbars in feature libraries. This applies **everywhere it is needed across the workspace**.
- For **read-only** rendering of stored rich text use **`<ui-texto-enriquecido>`** from `@tesoreria/ui-layout` (renders sanitized HTML, collapses long content). Do not bind stored HTML with `[innerHTML]` directly.
- **Storage format is HTML** in the existing text column; it is sanitized with DOMPurify (the render component already does it). Legacy plain text keeps working (line breaks preserved).
- `<ui-editor-enriquecido>` exposes `[(html)]`. It lazily loads `quill`/`ngx-quill` (~205 kB): import it **only from lazy feature libraries**, never from an eagerly-loaded app shell, so it stays out of the initial bundle. Its theme CSS (`node_modules/quill/dist/quill.snow.css`) must be added to the consuming app's global `styles`.
- **Do not** store HTML in short, structured, or backend-constrained fields (e.g., rejection/discard reasons stored as `varchar(500)` and rendered in notifications): those stay as plain inputs.

## Nomenclature & Legacy VB6 Strict Ban (Limpieza de UI)

- NEVER expose Visual Basic 6 legacy artifacts in user-facing UI: no `.frm`/`.vbp` extensions in titles, tables, or badges, and no phrases like "migración desde VB6", "formulario VB6", or legacy project names (`prjGestion.vbp`, `prjChequera.vbp`).
- Use clean domain terminology in copy and statuses: "Módulo de Chequeras", "Pendientes Pre Guaraní", "Orden de Compra", "Módulo en Desarrollo"; status indicators read "Planificado en Desarrollo", never "Pendiente de migración".
- Internal fields or routing names kept for backend protocol mapping are acceptable in TypeScript data structures, but they MUST NEVER be rendered into HTML templates or exposed to users.

## Permissions (Feature Gating)

- The backend exposes the permission catalog/assignment and the effective bundle per user (`GET /api/tesoreria/core/permisoEfectivo/usuario/{userId}`). The permission key is a contract: convention `modulo.accion` (e.g. `pagos.reembolsos`).
- Current status: **frontend gating is implemented** — `permisoGuard(clave)` (`@tesoreria/shared-api`), `ShellMenuItem.permiso` and the `*uiPermiso` directive (`@tesoreria/ui-layout`). The effective bundle loads at login through `PermisosService` and fails closed (empty) when unavailable, so items/actions that declare a `permiso` stay hidden.
- The management screens live in `libs/feature-permisos` (routes `/permisos`, `/roles`, `/catalogo`, `/simulador`), all behind `administradorGuard` in the `administrador` app.
- When adding a new view or action that requires a permission:
  1. Register the key in the catalog (administrador app → `feature-permisos` → Catálogo).
  2. Wire it: route with `permisoGuard('<clave>')`, menu item with `permiso: '<clave>'`, button with `*uiPermiso="'<clave>'"`.
- **Legacy rule:** never add or change gating on existing routes/screens, and never alter behavior the legacy system relies on. Gating applies to new features only; when in doubt, stop and ask.
- Anti-pattern "phantom permission": do not register keys that no code reads; declare the key in the same change that wires the feature.
