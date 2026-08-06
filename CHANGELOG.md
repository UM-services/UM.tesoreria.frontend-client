# Changelog

## [0.12.0] - 2026-08-06

### Added

- feat(guarani): Añadida la acción de captura de datos personales por documento desde el modal de consulta.
- feat(guarani): Añadida la consulta y visualización del número de chequera de cada inscripción preuniversitaria.

### Changed

- feat(guarani): La consulta de pendientes requiere ciclo lectivo y descarta respuestas obsoletas al cambiar los filtros.
- style(ui): Ajustada la escala tipográfica global de las aplicaciones a 87.5% para una interfaz más compacta.
- docs: Actualizados la versión, el diagrama de arquitectura y el pipeline para publicar los diagramas Mermaid renderizados.

## [0.11.0] - 2026-08-04

### Added

- feat(guarani): Nueva ruta protegida `/datos-personales` para consultar datos de alumnos por documento.
- feat(guarani): Modal de datos personales con información personal, contactos y requisitos presentados.
- feat(guarani): Acción para abrir los datos personales de cada alumno desde los resultados de pendientes.
- feat(guarani): Asociación, consulta y eliminación de tipos de chequera por propuesta y ciclo lectivo.

### Changed

- feat(guarani): Las propuestas se filtran por facultad y ubicación antes de habilitar la consulta de pendientes.
- docs: Actualizados README, arquitectura Mermaid y enlace del portal generado para reflejar los módulos actuales de Guaraní.

## [0.10.0] - 2026-08-02

### Added

- feat(guarani): Nueva aplicación Guaraní en el puerto `4207`.
- feat(guarani): Consulta de pendientes preuniversitarios por facultad, propuesta, ubicación y fecha.
- feat(guarani): Gestión de asociaciones entre sedes Guaraní y sedes Tesium.
- feat(guarani): Gestión de beneficios asociados a requisitos documentales.
- feat(guarani): Dockerfile, proxy Nginx y configuración de entorno para despliegue independiente.

### Changed

- refactor(ui-auth): Actualizado el barrel de `@tesoreria/ui-auth` para exportar el componente de login actual.
- refactor(workspace): Añadido `guarani` a `serve:all`, al pipeline de documentación y a la matriz de imágenes Docker.
- docs: Actualizados README y diagramas de arquitectura para incluir la aplicación Guaraní.

## [0.9.1] - 2026-07-10

### Added

- chore(ci): Nuevo workflow `docker-publish.yml` para build y push automático de imágenes Docker a Docker Hub
- chore(ci): Soporte de matrix strategy para construir las 6 aplicaciones en paralelo (administrador, chequeras, compras, contable, contratados, pagos)
- chore(ci): Integración de cache GHA para optimizar tiempos de build de Docker

## [0.9.0] - 2026-06-02

### Added

- feat(libs): Nueva librería `@tesoreria/feature-orden-compra` con módulo completo de Órdenes de Compra
- feat(compras): Nuevo módulo Órdenes de Compra con rutas `/orden-compra`, `/orden-compra/nueva`, `/orden-compra/oc/:id`
- feat(libs): Nuevo componente `BuscadorProveedorComponent` en `@tesoreria/ui-layout` para búsqueda de proveedores
- feat(compras): Integración de buscador de proveedores en formulario de proveedores
- feat(proveedores): Integración de `BuscadorProveedorComponent` en lugar de `BuscadorCuentaComponent`
- feat(orden-compra): Dashboard de OC con listado, simulación de roles y filtros por estado
- feat(orden-compra): Formulario multi-paso de creación de OC con carga de presupuestos, búsqueda de artículos, imputación contable y centros de costo
- feat(orden-compra): Flujo de aprobación por umbrales de monto con simulación de roles (Director de Compras, Administración, Rector, etc.)
- feat(orden-compra): Historial de tramitación tipo chat con adjuntos simulados (PDF)
- feat(orden-compra): Estados de OC: Pendiente Aprobación, Aprobada, Enviada, Cumplida, Anulada, Factura Parcial

### Changed

- refactor(ui-layout): Renombrado `BuscadorCuentaComponent` → `BuscadorCuentaContableComponent` para mayor claridad
- refactor(compras): Menú de navegación actualizado con entrada "Compras" para Órdenes de Compra
- refactor(proveedores): Reemplazado Buscador de Cuenta Contable por Buscador de Proveedor en formulario de proveedores
- refactor(docs): Pipeline de documentación mejorado con tabla de commits, PRs, métricas y copia de carpeta `docs/`
- refactor(deps): Actualizado `tsconfig.base.json` con path mapping para `@tesoreria/feature-orden-compra`

## [0.8.0] - 2026-05-09

### Added

- feat(libs): Nueva librería `@tesoreria/feature-gastos` con GastosComponent compartido
- feat(administrador): Añadido módulo Gastos con ruta `/gastos` y entrada en navegación
- feat(pagos): Añadido módulo Gastos con ruta `/gastos` y entrada en navegación

### Changed

- refactor(compras): Migrado GastosComponent a librería compartida `@tesoreria/feature-gastos`
- refactor(api): Cambiada URL base de API a `/api/tesoreria/core` en GastosComponent (independencia de environment)

## [0.7.0] - 2026-05-08

### Added

- feat(administrador): Añadido módulo Proveedores con ruta `/proveedores` y entrada en navegación
- feat(pagos): Añadido módulo Proveedores con ruta `/proveedores` y entrada en navegación
- feat(libs): Nueva librería `@tesoreria/feature-proveedores` para compartir ProveedoresComponent entre apps
- feat(ui-layout): BuscadorCuentaComponent ahora exportado desde `@tesoreria/ui-layout` como componente compartido

### Changed

- refactor(compras): Migrado ProveedoresComponent a librería compartida `@tesoreria/feature-proveedores`
- refactor(compras): Migrado BuscadorCuentaComponent a `@tesoreria/ui-layout`
- refactor(administrador): Migrado BuscadorCuentaComponent a `@tesoreria/ui-layout`
- refactor(api): Cambiada URL base de API a `/api/tesoreria/core` en ProveedoresComponent y BuscadorCuentaComponent (independencia de environment)
- refactor(docs): Simplificado pipeline de documentación reemplazando Compodoc por Nx Graph y dashboard interactivo
- refactor(docs): Eliminados triggers de PR en pipeline de documentación para optimizar ejecuciones

### Removed

- remove(compras): Eliminado `apps/compras/src/app/shared/buscador-cuenta/` (migrado a ui-layout)
- remove(administrador): Eliminado `apps/administrador/src/app/shared/buscador-cuenta/` (migrado a ui-layout)

## [0.6.0] - 2026-05-07

### Added

- feat(administrador): Nuevo módulo Dependencias con asignación de cuentas contables
- feat(administrador): Buscador de cuentas contables reutilizable (BuscadorCuentaComponent)
- feat(administrador): Ruta `/dependencias` con redirección desde raíz
- feat(administrador): Actualización del menú de navegación de "Inicio" a "Dependencias"

### Changed

- refactor(administrador): Eliminado uso de BlankComponent como ruta raíz, reemplazado por redirect a `/dependencias`

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
