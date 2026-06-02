# Arquitectura del Sistema

## Diagrama de Componentes

```mermaid
graph LR
    subgraph "Frontend Client"
        subgraph "Apps"
            Compras[Compras App<br/>:4201]
            Pagos[Pagos App<br/>:4202]
            Chequeras[Chequeras App<br/>:4203]
            Admin[Administrador App<br/>:4204]
            Contable[Contable App<br/>:4205]
            Contratados[Contratados App<br/>:4206]
        end

        subgraph "Libraries"
            SharedAPI[@tesoreria/shared-api<br/>AuthService<br/>AuthGuard<br/>Models]
            UIAuth[@tesoreria/ui-auth<br/>LoginComponent]
            UILayout[@tesoreria/ui-layout<br/>NavbarComponent<br/>SidebarComponent<br/>BuscadorCuentaContableComponent<br/>BuscadorProveedorComponent]
            FeatureProveedores[@tesoreria/feature-proveedores<br/>ProveedoresComponent]
            FeatureGastos[@tesoreria/feature-gastos<br/>GastosComponent]
            FeatureOrdenCompra[@tesoreria/feature-orden-compra<br/>OcDashboardComponent<br/>OcCreateComponent<br/>OcDetailComponent]
        end
    end

    Compras --> SharedAPI
    Compras --> UIAuth
    Compras --> UILayout
    Compras --> FeatureProveedores
    Compras --> FeatureGastos
    Compras --> FeatureOrdenCompra

    Pagos --> SharedAPI
    Pagos --> UIAuth
    Pagos --> UILayout
    Pagos --> FeatureProveedores
    Pagos --> FeatureGastos

    Chequeras --> SharedAPI
    Chequeras --> UIAuth
    Chequeras --> UILayout

    Admin --> SharedAPI
    Admin --> UIAuth
    Admin --> UILayout
    Admin --> FeatureProveedores
    Admin --> FeatureGastos

    Contable --> SharedAPI
    Contable --> UIAuth
    Contable --> UILayout

    Contratados --> SharedAPI
    Contratados --> UIAuth
    Contratados --> UILayout

    SharedAPI -->|HTTP| BackendAPI[Backend API<br/>Tesorería]
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    actor User
    participant Login as Login Component
    participant AuthService as AuthService
    participant AuthGuard as AuthGuard
    participant API as Backend API

    User->>Login: Ingresar credenciales
    Login->>AuthService: login(login, password)
    AuthService->>API: POST /auth/login
    API-->>AuthService: LoginResponse {token, userId, nombre, sede}
    AuthService-->>Login: Token almacenado
    Login->>AuthGuard: Navegar a ruta protegida
    AuthGuard->>AuthGuard: Verificar token
    AuthGuard-->>User: Acceso permitido
```

## Estructura de Módulos - Compras

```mermaid
graph TD
    ComprasApp[Compras App] --> AppRoutes[Rutas de la App]
    AppRoutes --> Login[Login Component<br/>@tesoreria/ui-auth]
    AppRoutes --> Blank[Blank Component<br/>Contenedor protegido]
    AppRoutes --> Proveedores[Proveedores Component<br/>@tesoreria/feature-proveedores]
    AppRoutes --> Gastos[Gastos Component<br/>@tesoreria/feature-gastos]
    AppRoutes --> OrdenCompra[OrdenCompra Module<br/>@tesoreria/feature-orden-compra]

    OrdenCompra --> OCDashboard[OcDashboardComponent<br/>Listado y simulación de roles]
    OrdenCompra --> OCCreate[OcCreateComponent<br/>Formulario multi-paso]
    OrdenCompra --> OCDetail[OcDetailComponent<br/>Detalle y aprobación]

    Proveedores --> BuscadorProveedor[BuscadorProveedor Component<br/>@tesoreria/ui-layout]
    Gastos --> BuscadorCuentaContable[BuscadorCuentaContable Component<br/>@tesoreria/ui-layout]
    OCCreate --> BuscadorProveedor
    OCCreate --> BuscadorCuentaContable
```

## Estructura de Módulos - Administrador

```mermaid
graph TD
    AdminApp[Administrador App] --> AppRoutes[Rutas de la App]
    AppRoutes --> Login[Login Component<br/>@tesoreria/ui-auth]
    AppRoutes --> Dependencias[Dependencias Component]
    AppRoutes --> Proveedores[Proveedores Component<br/>@tesoreria/feature-proveedores]
    AppRoutes --> Gastos[Gastos Component<br/>@tesoreria/feature-gastos]
    AppRoutes --> Redirect[Redirección a /dependencias]

    Dependencias --> BuscadorCuentaContable[BuscadorCuentaContable Component<br/>@tesoreria/ui-layout]
    Proveedores --> BuscadorProveedor[BuscadorProveedor Component<br/>@tesoreria/ui-layout]
    Gastos --> BuscadorCuentaContable
```

## Estructura de Módulos - Pagos

```mermaid
graph TD
    PagosApp[Pagos App] --> AppRoutes[Rutas de la App]
    AppRoutes --> Login[Login Component<br/>@tesoreria/ui-auth]
    AppRoutes --> Blank[Blank Component<br/>Contenedor protegido]
    AppRoutes --> Facturas[Facturas Pendientes Component]
    AppRoutes --> Proveedores[Proveedores Component<br/>@tesoreria/feature-proveedores]
    AppRoutes --> Gastos[Gastos Component<br/>@tesoreria/feature-gastos]

    Facturas --> BuscadorCuentaContable[BuscadorCuentaContable Component<br/>@tesoreria/ui-layout]
    Proveedores --> BuscadorProveedor[BuscadorProveedor Component<br/>@tesoreria/ui-layout]
    Gastos --> BuscadorCuentaContable
```

## Estructura de Módulos - Órdenes de Compra

```mermaid
graph TD
    OCMOD[feature-orden-compra] --> Routes[Rutas]
    Routes --> Dashboard[OcDashboardComponent<br/>/orden-compra]
    Routes --> Create[OcCreateComponent<br/>/orden-compra/nueva]
    Routes --> Detail[OcDetailComponent<br/>/orden-compra/oc/:id]

    Dashboard --> Service[OrdenCompraService]
    Create --> Service
    Detail --> Service

    Service --> Models[Modelos: OrdenCompra<br/>ArticuloOC, Comentario<br/>RolSimulado, OrdenCompraEstado]

    subgraph "Flujo de Estados"
        PEND[PENDIENTE_APROBACION] --> APRO[APROBADA]
        APRO --> ENV[ENVIADA]
        ENV --> CUM[CUMPLIDA]
        PEND --> ANU1[ANULADA]
        APRO --> ANU2[ANULADA]
        ENV --> CPP[CUMPLIDA_PARCIAL]
    end

    subgraph "Simulación de Roles"
        DIRC[Director de Compras<br/>Crear OC]
        DIRA[Director de Administración<br/>Aprobar ≤ $50k]
        SEC[Secretario Administrativo<br/>Aprobar $50k-$200k]
        DIRG[Director de Gestión<br/>Aprobar $50k-$200k]
        REC[Rector<br/>Aprobar > $200k]
    end
```

## Modelos de Datos - Autenticación

```mermaid
classDiagram
    class LoginRequest {
        +login: string
        +password?: string
    }

    class LoginResponse {
        +token: string
        +userId: number
        +nombre: string
        +sede: string
    }

    LoginRequest --> AuthService: envía credenciales
    AuthService --> LoginResponse: retorna respuesta
```
