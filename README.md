# UM Tesorería - Frontend Client

Sistema de gestión de tesorería construido con Angular 21 y Nx Workspace.

## Estructura del Proyecto

Este es un monorepo que contiene múltiples aplicaciones y librerías compartidas:

### Aplicaciones
- **compras** - Gestión de compras y proveedores (puerto 4201)
- **pagos** - Gestión de facturas pendientes (puerto 4202)
- **chequeras** - Gestión de chequeras (puerto 4203)
- **administrador** - Gestión administrativa (puerto 4204)
- **contable** - Módulo contable (puerto 4205)
- **contratados** - Gestión de contratados (puerto 4206)

### Librerías
- `@tesoreria/shared-api` - Servicios API, autenticación y modelos compartidos
- `@tesoreria/ui-auth` - Componentes de interfaz para autenticación
- `@tesoreria/ui-layout` - Componentes de layout (navbar, sidebar)

## Requisitos

- Node.js >= 20
- npm 11.6.2

## Instalación

```bash
npm install
```

## Desarrollo

### Ejecutar todas las aplicaciones
```bash
npm run serve:all
```

### Ejecutar aplicación específica
```bash
nx serve compras
nx serve pagos
nx serve chequeras
nx serve administrador
nx serve contable
nx serve contratados
```

### Construir
```bash
nx build
```

### Testing
```bash
nx test
```

## Arquitectura

```mermaid
graph TB
    subgraph Apps
        C[Compras<br/>:4201]
        P[Pagos<br/>:4202]
        Q[Chequeras<br/>:4203]
        A[Administrador<br/>:4204]
        CT[Contable<br/>:4205]
        CR[Contratados<br/>:4206]
    end

    subgraph "Compras Modules"
        PROV[Proveedores Component]
        GAST[Gastos Component]
        BUSC[BuscadorCuenta Component]
    end

    subgraph "Pagos Modules"
        FP[Facturas Pendientes Component]
    end

    subgraph Libs
        API[shared-api<br/>Auth Service<br/>API Models]
        AUTH[ui-auth<br/>Login Component]
        LAYOUT[ui-layout<br/>Navbar/sidebar]
    end

    C --> API
    C --> AUTH
    C --> LAYOUT
    C --> PROV
    C --> GAST
    PROV --> BUSC
    GAST --> BUSC

    P --> API
    P --> AUTH
    P --> LAYOUT
    P --> FP

    Q --> API
    Q --> AUTH
    Q --> LAYOUT

    A --> API
    A --> AUTH
    A --> LAYOUT

    CT --> API
    CT --> AUTH
    CT --> LAYOUT

    CR --> API
    CR --> AUTH
    CR --> LAYOUT

    API --> |AuthGuard| AUTH
```

## Tecnologías

| Tecnología | Versión |
|-----------|---------|
| Angular | 21.2.0 |
| Nx | 22.7.1 |
| Tailwind CSS | 4.2.4 |
| TypeScript | 5.9.2 |
| Vitest | 4.0.8 |
| Docker | 24-alpine (build) / nginx:alpine (runtime) |

## Despliegue con Docker

Cada aplicación incluye su propio Dockerfile con multi-stage build, soporte SSL/TLS con certificados auto-firmados y proxy inverso para rutas `/api/` hacia el servicio `tesoreria-gateway-service:8301`.

### Ejecutar contenedores
```bash
# Construir imagen para compras
docker build -f apps/compras/Dockerfile -t um-tesoreria-compras .

# Ejecutar contenedor (puertos 80 redirigen a 443)
docker run -p 8080:80 -p 8443:443 um-tesoreria-compras
```

### Características Docker
- **SSL/TLS**: Certificados auto-firmados generados al construir la imagen
- **Proxy Inverso**: Rutas `/api/` se redirigen al gateway de tesorería
- **Redirect**: HTTP (80) redirige automáticamente a HTTPS (443)

Aplicaciones disponibles:
- `apps/compras/Dockerfile` - Gestión de compras
- `apps/pagos/Dockerfile` - Gestión de facturas pendientes
- `apps/chequeras/Dockerfile` - Gestión de chequeras
- `apps/administrador/Dockerfile` - Gestión administrativa
- `apps/contable/Dockerfile` - Módulo contable
- `apps/contratados/Dockerfile` - Gestión de contratados

## Versionado

Este proyecto sigue [Semantic Versioning](https://semver.org/).

Versión actual: **0.5.0**

## Licencia

Privado - UM Tesorería
