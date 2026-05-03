# Arquitectura del Sistema

## Diagrama de Componentes

```mermaid
graph LR
    subgraph "Frontend Client"
        subgraph "Apps"
            Compras[Compras App<br/>:4201]
            Gestion[Gestion App<br/>:4202]
            Chequeras[Chequeras App<br/>:4203]
        end

        subgraph "Libraries"
            SharedAPI[@tesoreria/shared-api<br/>AuthService<br/>AuthGuard<br/>Models]
            UIAuth[@tesoreria/ui-auth<br/>LoginComponent]
            UILayout[@tesoreria/ui-layout<br/>NavbarComponent<br/>SidebarComponent]
        end
    end

    Compras --> SharedAPI
    Compras --> UIAuth
    Compras --> UILayout

    Gestion --> SharedAPI
    Gestion --> UIAuth
    Gestion --> UILayout

    Chequeras --> SharedAPI
    Chequeras --> UIAuth
    Chequeras --> UILayout

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
    AppRoutes --> Proveedores[Proveedores Component]

    Proveedores --> BuscadorCuenta[BuscadorCuenta Component]
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
