# Changelog

## [0.5.1] - 2026-05-07

### Fixed
- fix(compras): Eliminado mapeo redundante de `cuenta` a `numeroCuenta` en GastosComponent, ya que el backend retorna `numeroCuenta` correctamente

## [0.5.0] - 2026-05-07

### Added
- feat(pagos): Nueva aplicación pagos con módulo de facturas pendientes y descarga de planillas Excel
- feat(administrador): Nueva aplicación administrador (renombrada desde gestion)
- feat(contable): Nueva aplicación contable para módulo financiero
- feat(contratados): Nueva aplicación para gestión de contratados
- feat(ui-layout): Integración de logo institucional en sidebar (logo.png)
- feat(compras): Actualización de gastos con mejoras en formularios y validaciones

### Changed
- refactor(apps): Renombrado de gestion a pagos con nueva estructura de rutas y componentes
- refactor(compras): Actualización de componente de gastos con mejoras en UI y lógica
- refactor(ui-layout): Reemplazo de icono SVG por imagen de logo en sidebar
- refactor(docker): Actualización de Dockerfiles para nuevas aplicaciones (administrador, contable, contratados, pagos)

### Removed
- remove(gestion-e2e): Eliminada aplicación de pruebas e2e para gestion
- remove(gestion): Eliminada aplicación original, reemplazada por pagos y administrador

## [0.4.0] - 2026-05-05

### Added
- feat(compras): Nuevo módulo de Gastos con gestión de artículos y conceptos de gasto
- feat(compras): Integración de Gastos en el menú de navegación con icono SVG
- feat(compras): Buscador de gastos con debounce y paginación
- feat(compras): Formulario de gastos con asignación directa y selector de cuenta contable
- feat(compras): Modal de creación/edición de gastos con validación de formularios React Forms
- feat(compras): Integración de BuscadorCuentaComponent en módulo Gastos

### Changed
- refactor(compras): Búsqueda de proveedores con debounce automático y limpieza de código
- refactor(compras): Eliminación de console.log y comentarios innecesarios en ProveedoresComponent
- refactor(compras): Mejora en manejo de errores y detección de cambios con NgZone en GastosComponent
- fix(compras): Búsqueda de proveedores ahora acepta múltiples términos separados por espacios

## [0.3.0] - 2026-05-04

### Added
- feat(docker): Soporte SSL/TLS con certificados auto-firmados para todas las aplicaciones
- feat(docker): Proxy inverso en Nginx para rutas `/api/` hacia `tesoreria-gateway-service:8301`
- feat(docker): Redirección automática de HTTP (80) a HTTPS (443) en configuraciones Nginx
- feat(docker): Exposición del puerto 443 en todos los Dockerfiles de aplicaciones

### Changed
- refactor(docker): Actualización de configuraciones Nginx para escuchar en 443 SSL
- refactor(docker): Instalación de OpenSSL y generación de certificados en etapa de build de Docker
- refactor(docker): Adición de headers de proxy en configuración de Nginx para rutas `/api/`

## [0.2.0] - 2026-05-03

### Added
- feat: Docker support para todas las aplicaciones (compras, gestion, chequeras)
- feat: Multi-stage Dockerfiles con Node.js 24-alpine y Nginx
- feat: Configuración de Nginx para SPA routing en cada app
- feat: Entrypoint scripts para inicialización de entorno en contenedores
- feat: Actualización de configuraciones de entorno para producción

### Changed
- refactor(docs): Pipeline de documentación migrado de Node.js a Java/Maven para generación de dependency tree
- refactor(docs): Wiki simplificada para actuar como portal a la documentación principal
- refactor(docs): Eliminada generación de sitio HTML estático en favor de GitHub Pages
- fix(deps): Sincronización de package-lock.json con dependencias @emnapi

### Apps
- `compras` - Dockerfile, nginx.conf, entrypoint.sh añadidos
- `gestion` - Dockerfile, nginx.conf, entrypoint.sh añadidos
- `chequeras` - Dockerfile, nginx.conf, entrypoint.sh añadidos

## [0.1.0] - 2026-05-03

### Added
- feat: Inicialización de monorepo Angular con Nx workspace
- feat(compras): Módulo de proveedores con buscador de cuentas
- feat(compras): Sistema de autenticación con login y auth guard
- feat: Librería shared-api con servicios de autenticación y modelos
- feat: Librería ui-auth con componente de login
- feat: Librería ui-layout con navbar y sidebar
- feat: Aplicaciones gestion y chequeras configuradas
- feat: Configuración de testing con Vitest y Playwright
- feat: Integración de Tailwind CSS v4 y PostCSS
- feat: Configuración de ESLint y Prettier

### Apps
- `compras` - Gestión de compras con módulo de proveedores
- `gestion` - Aplicación de gestión administrativa
- `chequeras` - Gestión de chequeras

### Libs
- `@tesoreria/shared-api` - Servicios API compartidos y modelos de autenticación
- `@tesoreria/ui-auth` - Componentes de interfaz para autenticación
- `@tesoreria/ui-layout` - Componentes de layout (navbar, sidebar)
