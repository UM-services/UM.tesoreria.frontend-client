# Changelog

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
