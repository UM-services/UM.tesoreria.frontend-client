# Arquitectura del Sistema

## Diagrama de Componentes

```mermaid
    flowchart LR
    subgraph "Frontend Client"
        subgraph "Apps"
            Compras["Compras App<br/>:4201"]
            Pagos["Pagos App<br/>:4202"]
            Chequeras["Chequeras App<br/>:4203"]
            Admin["Administrador App<br/>:4204"]
            Contable["Contable App<br/>:4205"]
            Contratados["Contratados App<br/>:4206"]
            Guarani["Guaraní App<br/>:4207"]
            ExternoConsulta["Externo Consulta App<br/>:4208"]
        end

        subgraph "Libraries"
            SharedAPI["@tesoreria/shared-api<br/>AuthService, guards e interceptores<br/>PermisosService, permisoGuard<br/>y permisoAlgunoGuard<br/>AccesoDenegadoService<br/>SolicitudAccesoService<br/>Models, tokens API_URL y EXTERNO_*"]
            UIAuth["@tesoreria/ui-auth<br/>LoginComponent<br/>CambioClaveModalComponent"]
            UILayout["@tesoreria/ui-layout<br/>UiShellComponent y submenús<br/>Buscadores compartidos<br/>InputFechaComponent<br/>TextoEnriquecidoComponent<br/>InactividadComponent<br/>SolicitarAccesoModalComponent<br/>PermisoDirective y PermisoAlgunoDirective"]
            UIRichText["@tesoreria/ui-rich-text<br/>EditorEnriquecidoComponent"]
            FeatureProveedores["@tesoreria/feature-proveedores<br/>ProveedoresComponent"]
            FeatureGastos["@tesoreria/feature-gastos<br/>GastosComponent"]
            FeaturePedidoCompra["@tesoreria/feature-pedido-compra<br/>PedidoListaComponent<br/>PedidoFormComponent<br/>PedidoBandejaComponent<br/>PedidoRevisionComponent<br/>PedidoPresupuestoComponent<br/>PedidoConsultaComponent<br/>PedidoDetalleComponent<br/>CotizacionProcesoListaComponent<br/>CotizacionProcesoFormComponent<br/>CotizacionProcesoDetalleComponent<br/>CotizacionProcesoPedidasComponent<br/>CotizacionAdjudicacionComponent<br/>FormalizacionListaComponent<br/>FormalizacionDetalleComponent<br/>RecepcionListaComponent<br/>RecepcionDetalleComponent"]
            FeatureAdministrador["@tesoreria/feature-administrador<br/>DependenciasComponent<br/>UsuariosComponent<br/>AsignacionUsuariosComponent<br/>AutorizantesEnvioComponent<br/>AutoridadesPresupuestoComponent<br/>CotizacionesMinimasComponent"]
            FeaturePermisos["@tesoreria/feature-permisos<br/>PermisosComponent, RolesComponent<br/>CatalogoComponent (sólo lectura + sync)<br/>SolicitudesAccesoComponent<br/>SimuladorComponent"]
            FeatureGuarani["@tesoreria/feature-guarani<br/>GUARANI_ROUTES<br/>Pendientes, Ubicaciones, Beneficios<br/>Datos Personales, SedePrincipalGuard"]
            FeatureExterno["@tesoreria/feature-externo-consulta<br/>ChequerasComponent<br/>ChequerasBusquedaStore<br/>ChequerasService"]
            FeatureContable["@tesoreria/feature-contable<br/>CUENTAS_BANCARIAS_ROUTES<br/>CuentasBancariasComponent<br/>BancariaService"]
            FeatureChequeras["@tesoreria/feature-chequeras<br/>cobranzaRoutes, consultaRoutes<br/>CobranzasHome, Importar, Importaciones<br/>Generar, PagoManual, BajaChequera<br/>ConsultasHome, DetalleCuotas"]
            FeaturePagos["@tesoreria/feature-pagos<br/>PAGOS_ROUTES<br/>ComprobantesComponent<br/>ComprobantesService"]
        end
    end

    Compras --> SharedAPI
    Compras --> UIAuth
    Compras --> UILayout
    Compras --> FeatureProveedores
    Compras --> FeatureGastos
    Compras --> FeaturePedidoCompra

    Pagos --> SharedAPI
    Pagos --> UIAuth
    Pagos --> UILayout
    Pagos --> FeatureProveedores
    Pagos --> FeatureGastos
    Pagos -->|"loadChildren"| FeaturePagos
    FeaturePagos --> SharedAPI
    FeaturePagos --> UILayout

    Chequeras --> SharedAPI
    Chequeras --> UIAuth
    Chequeras --> UILayout
    Chequeras -->|"loadChildren"| FeatureChequeras
    FeatureChequeras --> SharedAPI
    FeatureChequeras --> UILayout

    Admin --> SharedAPI
    Admin --> UIAuth
    Admin --> UILayout
    Admin --> FeatureProveedores
    Admin --> FeatureGastos
    Admin --> FeatureAdministrador
    Admin --> FeaturePermisos

    Contable --> SharedAPI
    Contable --> UIAuth
    Contable --> UILayout
    Contable -->|"loadChildren"| FeatureContable
    FeatureContable --> SharedAPI
    FeatureContable --> UILayout

    Contratados --> SharedAPI
    Contratados --> UIAuth
    Contratados --> UILayout

    Guarani --> SharedAPI
    Guarani --> UIAuth
    Guarani --> UILayout
    Guarani -->|"loadChildren"| FeatureGuarani
    FeatureGuarani --> SharedAPI
    FeatureGuarani --> UILayout

    ExternoConsulta --> SharedAPI
    ExternoConsulta --> UIAuth
    ExternoConsulta --> UILayout
    ExternoConsulta -->|"loadComponent"| FeatureExterno
    FeatureExterno --> SharedAPI
    FeatureExterno --> UILayout

    FeaturePedidoCompra --> UIRichText

    UILayout -->|"modal cambio de clave"| UIAuth

    SharedAPI -->|"HTTP + Bearer"| BackendAPI["Backend API<br/>Tesorería"]
```

## Flujo de Autenticación

```mermaid
sequenceDiagram
    actor User
    participant Login as Login Component
    participant AuthService as AuthService
    participant AuthGuard as AuthGuard
    participant AuthInterceptor as Auth interceptor
    participant ErrorInterceptor as Error interceptor
    participant API as Backend API

    participant Cambio as Modal Cambiar Clave

    User->>Login: Ingresar credenciales
    Login->>AuthService: login(login, password)
    AuthService->>AuthInterceptor: POST /auth/login
    AuthInterceptor->>API: Solicitud con token si existe
    API-->>AuthService: LoginResponse {token, userId, login, nombre, sede, administrador, usuarioExterno, ...}
    AuthService->>API: GET /auth/me/{userId} (revalidar flags de acceso)
    AuthService-->>Login: Sesión almacenada con flags del backend
    Note over Login,Cambio: Si debeCambiarClave = 1, ui-shell abre el modal forzado y no permite cerrarlo hasta cambiar la clave
    Login->>AuthGuard: Navegar a ruta protegida
    AuthGuard->>AuthGuard: Verificar token
    AuthGuard-->>User: Acceso permitido
    User->>AuthInterceptor: Solicitud protegida
    AuthInterceptor->>API: Authorization: Bearer + X-User-Id
    API-->>ErrorInterceptor: 401 o 403
    ErrorInterceptor->>AuthService: logout()
    ErrorInterceptor-->>User: Navegar a /login
    User->>Cambio: Abrir Cambiar clave desde ui-shell
    Cambio->>AuthService: getUser(userId) para completar la sesión
    AuthService->>API: GET /auth/me/{userId}
    API-->>AuthService: LoginResponse con login
    Cambio-->>User: Sesión completada con login
    User->>Cambio: Completar clave anterior y clave nueva
    Cambio->>AuthService: changePassword(ChangePasswordRequest)
    AuthService->>API: POST /auth/change-password
    API-->>AuthService: LoginResponse actualizado
    AuthService-->>Cambio: Sesión y storage fusionados con la respuesta
    Cambio-->>User: Mensaje de éxito y cierre automático
```

`LoginResponse` incluye `debeCambiarClave` (1 = clave provisoria puesta por un administrador). Cuando la
sesión lo trae en 1, `ui-shell` (`@tesoreria/ui-layout`) abre el modal de cambio de clave y bloquea su
cierre hasta que el usuario la cambie; `POST /change-password` actualiza la sesión y limpia el flag, con
lo que el modal deja de reabrirse.

### Guards de acceso por módulo

`@tesoreria/shared-api` exporta, además de `authGuard` (sólo sesión), guards que leen
los flags de `LoginResponse` (`esAdministrador` / `esUsuarioExterno` en `auth.flags.ts`):

- `administradorGuard`: habilita las rutas del app **administrador** sólo con `administrador = 1`.
- `usuarioInternoGuard`: bloquea los módulos internos cuando `usuarioExterno = 1`,
  que sólo debe operar en **externo-consulta**.

Ambas redirigen a la ruta pública `sin-acceso` (`NoAccesoComponent` de `@tesoreria/ui-layout`),
que cada app registra antes del wildcard para evitar bucles con `/login`. Como el `localStorage`
es editable por el usuario, la sesión se revalida contra `GET /auth/me/{userId}` al arrancar la
app y tras el login: el backend es la fuente de verdad y debe denegar 401/403 en las APIs que
correspondan. El `errorInterceptor` distingue ambos casos: **401** cierra la sesión y vuelve al
login con `motivo=sesion-expirada`; **403** es un resultado de autorización y **no** cierra la
sesión, sólo publica el detalle en `AccesoDenegadoService` para que el shell muestre un aviso.

### Gating de permisos

`@tesoreria/shared-api` exporta `PermisosService` y `permisoGuard(clave)`. El servicio carga el bundle
efectivo del usuario (`GET /permisoEfectivo/usuario/{userId}`) al iniciar sesión y lo limpia al
cerrar; si la llamada falla el bundle queda vacío (**fail-closed**). La clave sigue la convención
`modulo.accion` (p. ej. `compras.iniciar_pedido`). `permisoGuard` espera `ensureLoaded` antes de
decidir y, al denegar, redirige a `sin-acceso` (nunca a `/login`, para no generar bucles).
`permisoAlgunoGuard(claves)` aplica la misma semántica con alternativa (**OR**): autoriza si el
usuario tiene al menos una de las claves, para vistas compartidas por roles distintos (p. ej. el
detalle de un pedido, que ven solicitante y autorizante). Cada app declara sus rutas gated junto a
los guards de acceso: `[authGuard, usuarioInternoGuard, administradorGuard, permisoGuard('<clave>')]`
o `permisoAlgunoGuard(['<clave>', ...])`. Toda denegación de guard reporta su motivo en
`AccesoDenegadoService` y redirige a `sin-acceso`; ninguna cierra la sesión.

En la UI, `@tesoreria/ui-layout` aporta `PermisoDirective` (`*uiPermiso="'modulo.accion'"`),
`PermisoAlgunoDirective` (`*uiPermisoAlguno="['<clave>', ...]"`) y el campo
`ShellMenuItem.permiso`; `UiShellComponent.visibleMenuItems` oculta los ítems sin permiso,
aplica el mismo filtro a los hijos de un submenú (`ShellMenuItem.children`) y mantiene visibles
los que no declaran `permiso`. El header `X-User-Id` que agrega `authInterceptor` es identidad
transitoria para el PEP de las fachadas, hasta que el gateway valide el JWT. Las pantallas de
administración del catálogo, roles, asignaciones y simulador viven en `@tesoreria/feature-permisos`
(app administrador, detrás de `administradorGuard`). El **Catálogo es de sólo lectura**: la
fuente de verdad es `permisos.yaml` del core y la pantalla sólo consulta el inventario o dispara
`POST /permiso/sync` (dry-run o aplicación). Los pedidos de acceso enviados desde `sin-acceso`
o el banner del shell se resuelven en `/solicitudes`; aprobar registra la decisión, pero la
asignación efectiva se hace en la pantalla de Usuarios.

## Estructura de Módulos - Compras

```mermaid
    flowchart TD
    ComprasApp["Compras App"] --> AppRoutes["Rutas de la App"]
    AppRoutes --> Login["Login Component<br/>@tesoreria/ui-auth"]
    AppRoutes --> Blank["Blank Component<br/>Contenedor protegido"]
    AppRoutes --> Proveedores["Proveedores Component<br/>@tesoreria/feature-proveedores"]
    AppRoutes --> Gastos["Gastos Component<br/>@tesoreria/feature-gastos"]
    AppRoutes --> Pedidos["PedidoCompra Routes<br/>@tesoreria/feature-pedido-compra<br/>guards por ruta:<br/>iniciar, enviar, revisar,<br/>autorizar presupuesto y consultar"]
    AppRoutes --> Cotizaciones["Cotizacion Routes<br/>@tesoreria/feature-pedido-compra<br/>guards por ruta:<br/>gestionar cotizaciones<br/>y autorizar adjudicación"]
    AppRoutes --> Formalizacion["Formalizacion Routes<br/>@tesoreria/feature-pedido-compra<br/>guard por ruta: formalizar<br/>(emitir Orden de Compra)"]
    AppRoutes --> Recepcion["Recepcion Routes<br/>@tesoreria/feature-pedido-compra<br/>guard por ruta: recepcionar<br/>(entrega total o parcial y cierre manual)"]

    Proveedores --> BuscadorProveedor["BuscadorProveedor Component<br/>@tesoreria/ui-layout"]
    Gastos --> BuscadorCuentaContable["BuscadorCuentaContable Component<br/>@tesoreria/ui-layout"]
    Pedidos --> Bandeja["PedidoBandeja Component<br/>compras.enviar_pedido"]
    Pedidos --> Revision["PedidoRevision Component<br/>compras.estimar"]
    Pedidos --> Presupuesto["PedidoPresupuesto Component<br/>compras.presupuesto.autorizar"]
    Pedidos --> Consulta["PedidoConsulta Component<br/>compras.consultar_pedidos"]
    Pedidos --> Detalle["PedidoDetalle Component<br/>permisoAlgunoGuard"]
    Pedidos --> Editor["EditorEnriquecido Component<br/>@tesoreria/ui-rich-text"]
    Pedidos --> Texto["TextoEnriquecido Component<br/>@tesoreria/ui-layout"]
    Pedidos --> PedidoAPI["Fachada tesoreria-compras<br/>/compras/pedido"]
    Bandeja --> PedidoAPI
    Revision --> PedidoAPI
    Presupuesto --> PedidoAPI
    Consulta --> PedidoAPI
    Detalle --> PedidoAPI

    Cotizaciones --> CotizacionLista["CotizacionProcesoLista Component<br/>compras.cotizaciones.gestionar"]
    Cotizaciones --> CotizacionForm["CotizacionProcesoForm Component<br/>compras.cotizaciones.gestionar"]
    Cotizaciones --> CotizacionDetalle["CotizacionProcesoDetalle Component<br/>compras.cotizaciones.gestionar"]
    Cotizaciones --> CotizacionPedidas["CotizacionProcesoPedidas Component<br/>compras.cotizaciones.gestionar"]
    Cotizaciones --> CotizacionAdjudicacion["CotizacionAdjudicacion Component<br/>compras.adjudicacion.autorizar"]
    Cotizaciones --> BuscadorProveedor
    CotizacionLista --> CotizacionAPI["Fachada tesoreria-compras<br/>/compras/cotizacion"]
    CotizacionForm --> CotizacionAPI
    CotizacionDetalle --> CotizacionAPI
    CotizacionPedidas --> CotizacionAPI
    CotizacionAdjudicacion --> CotizacionAPI
    Formalizacion --> FormalizacionLista["FormalizacionLista Component<br/>compras.formalizar"]
    Formalizacion --> FormalizacionDetalle["FormalizacionDetalle Component<br/>compras.formalizar"]
    FormalizacionLista --> FormalizacionAPI["Fachada tesoreria-compras<br/>/compras/formalizacion"]
    FormalizacionDetalle --> FormalizacionAPI
    Recepcion --> RecepcionLista["RecepcionLista Component<br/>compras.recepcionar"]
    Recepcion --> RecepcionDetalle["RecepcionDetalle Component<br/>compras.recepcionar"]
    RecepcionLista --> RecepcionAPI["Fachada tesoreria-compras<br/>/compras/recepcion"]
    RecepcionDetalle --> RecepcionAPI
```

## Estructura de Módulos - Administrador

```mermaid
    flowchart TD
    AdminApp["Administrador App"] --> AppRoutes["Rutas de la App"]
    AppRoutes --> Login["Login Component<br/>@tesoreria/ui-auth"]
    AppRoutes --> Dependencias["Dependencias Component<br/>@tesoreria/feature-administrador"]
    AppRoutes --> Asignaciones["AsignacionUsuarios Component<br/>@tesoreria/feature-administrador"]
    AppRoutes --> Autorizantes["AutorizantesEnvio Component<br/>@tesoreria/feature-administrador<br/>compras.autorizantes.configurar"]
    AppRoutes --> Usuarios["Usuarios Component<br/>@tesoreria/feature-administrador<br/>alta con login sugerido, configuración y reset de clave"]
    AppRoutes --> Autoridades["AutoridadesPresupuesto Component<br/>@tesoreria/feature-administrador<br/>compraReferencia, compraAutoridadPerfil<br/>y compraAutoridadUsuario del core"]
    AppRoutes --> CotizacionesMinimas["CotizacionesMinimas Component<br/>@tesoreria/feature-administrador<br/>compras.cotizaciones.configurar"]
    AppRoutes --> Proveedores["Proveedores Component<br/>@tesoreria/feature-proveedores"]
    AppRoutes --> Gastos["Gastos Component<br/>@tesoreria/feature-gastos"]
    AppRoutes --> Permisos["Permisos Component<br/>@tesoreria/feature-permisos"]
    AppRoutes --> Roles["Roles Component<br/>@tesoreria/feature-permisos"]
    AppRoutes --> Catalogo["Catalogo Component<br/>@tesoreria/feature-permisos<br/>inventario de sólo lectura + POST /permiso/sync"]
    AppRoutes --> Simulador["Simulador Component<br/>@tesoreria/feature-permisos"]
    AppRoutes --> Solicitudes["SolicitudesAcceso Component<br/>@tesoreria/feature-permisos<br/>pedidos de acceso pendientes"]
    AppRoutes --> Redirect["Redirección a /dependencias"]

    Dependencias --> BuscadorCuentaContable["BuscadorCuentaContable Component<br/>@tesoreria/ui-layout"]
    Asignaciones --> PermisosAPI["API de seguridad del core<br/>usuario, rol, permiso y overrides"]
    Autorizantes --> AutorizantesAPI["Contexto compras/autorizanteEnvio del core<br/>usuarioId + conjunto de dependencias<br/>GET/PUT /usuario/{usuarioId}"]
    Usuarios --> UsuariosAPI["Slice usuario del core<br/>searchTodos, alta con login generado,<br/>login-sugerido, configuración, activo y password"]
    Autoridades --> AutoridadesAPI["Slices de presupuesto del core<br/>compraReferencia, compraAutoridadPerfil<br/>y compraAutoridadUsuario"]
    CotizacionesMinimas --> TramosAPI["Fachada tesoreria-compras<br/>/compras/cotizacion/tramos"]
    Permisos --> PermisosAPI
    Roles --> PermisosAPI
    Catalogo --> PermisosAPI
    Simulador --> PermisosAPI
    Solicitudes --> PermisosAPI
    Proveedores --> BuscadorProveedor["BuscadorProveedor Component<br/>@tesoreria/ui-layout"]
    Gastos --> BuscadorCuentaContable
```

## Estructura de Módulos - Chequeras

```mermaid
    flowchart TD
    ChequerasApp["Chequeras App"] --> AppRoutes["Rutas de la App"]
    AppRoutes --> Login["Login Component<br/>@tesoreria/ui-auth"]
    AppRoutes --> Dashboard["Dashboard Component<br/>accesos filtrados por permiso"]
    AppRoutes --> Personas["Personas Component<br/>@tesoreria/feature-personas"]
    AppRoutes --> Cobranzas["cobranzaRoutes<br/>@tesoreria/feature-chequeras<br/>permisoAlgunoGuard"]
    AppRoutes --> Consultas["consultaRoutes<br/>@tesoreria/feature-chequeras<br/>permisoAlgunoGuard"]

    Cobranzas --> CobranzasHome["CobranzasHome Component<br/>chequeras.cobranzas.*"]
    Cobranzas --> Importar["ImportarLista e ImportarProceso<br/>chequeras.cobranzas.importar"]
    Cobranzas --> Importaciones["ImportacionesHistorial Component<br/>chequeras.cobranzas.importar"]
    Cobranzas --> Generar["GenerarLista y GenerarProceso<br/>chequeras.cobranzas.generar"]
    Cobranzas --> PagoManual["PagoManual Component<br/>chequeras.cobranzas.pagoManual"]
    Cobranzas --> Baja["BajaChequera Component<br/>chequeras.cobranzas.baja"]

    Consultas --> ConsultasHome["ConsultasHome Component<br/>chequeras.consultas.detalleCuotas"]
    Consultas --> DetalleCuotas["DetalleCuotasFacultadSede Component<br/>chequeras.consultas.detalleCuotas"]

    Importar --> CobranzaAPI["Fachada de cobranzas del core<br/>/cobranza/importacion"]
    Importaciones --> CobranzaAPI
    Generar --> GeneracionAPI["/cobranza/generacion"]
    PagoManual --> PagoAPI["/cobranza/pago-manual"]
    Baja --> ChequeraAPI["/chequeraSerie, /chequeraCuota,<br/>/chequeraPago, /baja y /processBaja"]
    DetalleCuotas --> ResumenAPI["core: /chequeraSerie/resumen/lectivo/{lectivoId}"]
    DetalleCuotas --> ReportZip["report: /chequeras/planilla/detalle/zip"]
    PagoManual --> BuscadorPersona["BuscadorPersona Component<br/>@tesoreria/ui-layout"]
    Baja --> BuscadorPersona
```

## Estructura de Módulos - Pagos

```mermaid
    flowchart TD
    PagosApp["Pagos App"] --> AppRoutes["Rutas de la App"]
    AppRoutes --> Login["Login Component<br/>@tesoreria/ui-auth"]
    AppRoutes --> Blank["Blank Component<br/>Contenedor protegido"]
    AppRoutes --> Facturas["Facturas Pendientes Component"]
    AppRoutes --> Proveedores["Proveedores Component<br/>@tesoreria/feature-proveedores"]
    AppRoutes --> Gastos["Gastos Component<br/>@tesoreria/feature-gastos"]
    AppRoutes --> Comprobantes["PAGOS_ROUTES<br/>@tesoreria/feature-pagos<br/>permisoGuard"]

    Facturas --> BuscadorCuentaContable["BuscadorCuentaContable Component<br/>@tesoreria/ui-layout"]
    Proveedores --> BuscadorProveedor["BuscadorProveedor Component<br/>@tesoreria/ui-layout"]
    Gastos --> BuscadorCuentaContable
    Comprobantes --> ComprobantesComp["Comprobantes Component<br/>pagos.comprobantes.consultar"]
    ComprobantesComp --> BuscadorProveedor
    ComprobantesComp --> InputFecha["InputFecha Component<br/>@tesoreria/ui-layout"]
    ComprobantesComp --> MovimientoAPI["core: /proveedorMovimiento<br/>DELETE /compra/comprobante/{id}"]
```

## Estructura de Módulos - Guaraní

```mermaid
flowchart TD
    GuaraniApp["Guaraní App<br/>Shell delgado"] -->|"loadChildren"| LibRoutes["GUARANI_ROUTES<br/>@tesoreria/feature-guarani"]
    LibRoutes --> SedeGuard["GuaraniSedePrincipalGuard<br/>Rutas administrativas por sede"]
    LibRoutes --> Pendientes["Pendientes Pre Guaraní"]
    LibRoutes --> Ubicaciones["Asociaciones de sedes Guaraní y Tesium"]
    LibRoutes --> Beneficios["Beneficios de requisitos y porcentajes"]
    LibRoutes --> Datos["Datos Personales y captura<br/>/datos-personales"]

    Pendientes --> GuaraniAPI["API Guaraní"]
    Pendientes --> SedeFilter["Filtrado de ubicaciones por sede"]
    Pendientes --> Chequeras["Consulta de números de chequera"]
    Pendientes --> CoreAPI
    Ubicaciones --> CoreAPI["API Core"]
    Beneficios --> CoreAPI
    Datos --> GuaraniAPI
    Datos --> Beneficios
    Datos --> Captura["Captura de datos personales"]
    Datos --> BuscadorPersona["BuscadorPersona Component<br/>@tesoreria/ui-layout"]
```

## Modelos de Datos - Autenticación

```mermaid
classDiagram
    class LoginRequest {
        +string login
        +string password
    }

    class LoginResponse {
        +string token
        +number userId
        +string login
        +string nombre
        +string sede
        +number geograficaId
        +number dependenciaId
        +number administrador
        +number usuarioExterno
        +number activo
        +number debeCambiarClave
        +number imprimeChequera
        +number numeroOpManual
        +number habilitaOpEliminacion
        +number eliminaChequera
        +number modificaChequera
        +string lastLog
        +string googleMail
    }

    class ChangePasswordRequest {
        +number userId
        +string login
        +string currentPassword
        +string newPassword
        +string reClaveNueva
        +string nombre
    }

    class AuthService {
        +login(login, password)
        +logout()
        +getUser(userId)
        +changePassword(request)
    }

    LoginRequest --> AuthService: envía credenciales
    ChangePasswordRequest --> AuthService: envía cambio de clave
    AuthService --> LoginResponse: retorna respuesta
```
