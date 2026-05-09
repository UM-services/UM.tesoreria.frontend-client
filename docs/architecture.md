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
            UILayout[@tesoreria/ui-layout<br/>NavbarComponent<br/>SidebarComponent<br/>BuscadorCuentaComponent]
            FeatureProveedores[@tesoreria/feature-proveedores<br/>ProveedoresComponent]
            FeatureGastos[@tesoreria/feature-gastos<br/>GastosComponent]
        end
    end

    Compras --> SharedAPI
    Compras --> UIAuth
    Compras --> UILayout
    Compras --> FeatureProveedores
    Compras --> FeatureGastos

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

    Proveedores --> BuscadorCuenta[BuscadorCuenta Component<br/>@tesoreria/ui-layout]
    Gastos --> BuscadorCuenta[BuscadorCuenta Component<br/>@tesoreria/ui-layout]
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

    Dependencias --> BuscadorCuenta[BuscadorCuenta Component<br/>@tesoreria/ui-layout]
    Proveedores --> BuscadorCuenta
    Gastos --> BuscadorCuenta
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

    Facturas --> BuscadorCuenta[BuscadorCuenta Component<br/>@tesoreria/ui-layout]
    Proveedores --> BuscadorCuenta
    Gastos --> BuscadorCuenta
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
