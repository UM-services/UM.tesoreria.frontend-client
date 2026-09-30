# Changelog

## [0.26.3] - 2026-09-30

### Fixed

- fix(externo-consulta): La descarga "Estado (PDF)" del detalle de chequera pasa del endpoint del core `chequera/generateEstadoPdf/...` al servicio `report` del gateway: `GET report/chequeras/estado/facultad/{facultadId}/tipoChequera/{tipoChequeraId}/chequeraSerie/{chequeraSerieId}/alternativa/{alternativaId}/debitoTipo/{debitoTipoId}` (débito directo por CBU por defecto, `debitoTipoId = 2`). El generador del PDF de estado migró del core a `report`, así que el botón deja de depender del endpoint pendiente que respondía 404 y se retira el aviso dedicado "El PDF de estado de chequera todavía no está disponible en el servidor."; ese error cae ahora en el genérico de `mensajeErrorPdf` ("No se pudo generar el PDF.", o el `message` del blob cuando el servidor lo envía).

### Changed

- refactor(externo-consulta): Los environments suman el campo `apiBase` (mismo `BACKEND_URL_PLACEHOLDER`, reemplazado en runtime por el `entrypoint.sh` de la app junto con `apiUrl`) y `ChequerasService` deriva de él `coreBaseUrl` (`{apiBase}/core`) y el nuevo `reportBaseUrl` (`{apiBase}/report`), en lugar de quitar el sufijo `/auth` a `apiUrl`; las URLs de los endpoints del core quedan equivalentes.
- test: `ChequerasService` especifica la nueva URL `report/chequeras/estado/...` del PDF de estado, y el spec del modal valida el fallback genérico ante 404.
- docs: README lista el servicio `report` del gateway como prerequisito de la prueba local de `/chequeras` y registra la versión actual **0.26.3**.

## [0.26.2] - 2026-09-28

### Changed

- ci: `docker-publish.yml` instala las dependencias con `npm ci` en lugar de `npm install --legacy-peer-deps`, siguiendo la política del repositorio de instalar desde el lockfile; era el último workflow que usaba `npm install` (`ci.yml`, `deploy-develop.yml`, `deploy-staging.yml` y `generate-docs.yml` ya usaban `npm ci`).
- ci: Las imágenes de `docker-publish.yml` se etiquetan ahora también con el SHA completo del commit (`type=raw,value=${{ github.sha }}`) además de la etiqueta corta `type=sha` y `latest`, para poder fijar el despliegue a una imagen exacta.
- docs: README registra la versión actual **0.26.2** y `AGENTS.md` actualiza su nota de instalación, que afirmaba que los workflows de CI usaban `npm install`.

## [0.26.1] - 2026-09-28

### Fixed

- fix(externo-consulta): Red de seguridad local en `/chequeras`: el nuevo computed `chequerasAsignadas` de `ChequerasBusquedaStore` descarta las filas de facultades o sedes geográficas no asignadas —incluidas las que llegan con `geograficaId` nulo— aunque el core las devuelva, y `chequerasFiltradas` (de la que derivan `chequerasVisibles`, `resumen` y `titular`) se construye sobre esa lista; el catálogo `sedes` queda expuesto como signal para poder validar esa dimensión. La clase de chequera no puede validarse en el frontend (la fila trae `tipoChequeraId`, no la clase), por lo que ese tramo sigue garantizado por el filtro del core sobre `/asignaciones`.
- test: Dos specs nuevas en `ChequerasBusquedaStore`: oculta chequeras de facultades o sedes no asignadas aunque la API las devuelva, y la vista "con deuda" y el `resumen` usan sólo las chequeras asignadas.

### Changed

- docs: README documenta la red de seguridad local de `/chequeras` junto a la nota del filtro por asignaciones y registra la versión actual **0.26.1**.

## [0.26.0] - 2026-09-28

### Added

- feat(externo-consulta): La consulta `/chequeras` se limita ahora por las **tres dimensiones de asignación** del usuario —facultad, sede geográfica y clase de chequera— en lugar de sólo la facultad: el store carga los catálogos `sedesUsuario` y `clasesUsuario` junto a `facultadesUsuario` y las chequeras llegan del core ya filtradas por la intersección de las asignaciones. Rige la decisión "vacío = nada" en cada dimensión: si falta alguna, la consulta queda bloqueada con un mensaje terminal que indica cuál (prioridad del mensaje: facultad > sede > clase), igual que antes con las facultades.
- feat(externo-consulta): Nuevos métodos `ChequerasService.sedesUsuario(userId)` (`GET core/usuarioChequeraGeografica/user/{userId}`) y `ChequerasService.clasesUsuario(userId)` (`GET core/usuarioChequeraClaseChequera/user/{userId}`), con los modelos `SedeAsignada` y `ClaseChequeraAsignada` en `chequeras.models.ts`, normalizados con `normalizarLista` como el resto de catálogos.
- test: Specs de las nuevas dimensiones en `ChequerasBusquedaStore` (bloqueo terminal por sede o por clase con su `dimension`, y error de catálogo que informa qué asignación falló con su status), de `ChequerasService` (URLs de `usuarioChequeraGeografica`/`usuarioChequeraClaseChequera` sin `/auth/` y consulta de chequeras sobre `.../asignaciones`) y del componente (mocks de sedes y clases para el arranque de la vista).

### Changed

- refactor(externo-consulta): El estado terminal de catálogos pasa de `sinFacultades` a `sinAsignaciones` con el campo `dimension` (`DimensionAsignacion = 'facultad' | 'sede' | 'clase'`), y la vista muestra en plural el nombre de la dimensión faltante ("facultades" / "sedes" / "clases de chequera") vía `nombreDimension()` en lugar del literal fijo de facultades.
- refactor(externo-consulta): La consulta de chequeras pasa de `GET chequeraSerie/usuario/{userId}/lectivo/{lectivoId}` a `GET chequeraSerie/usuario/{userId}/lectivo/{lectivoId}/asignaciones` (documentado en el modelo `ChequeraEstado`), y el helper `sinDuplicados` deduplica las filas de las tres asignaciones que el core puede devolver repetidas.
- docs: README actualiza "Probar externo-consulta localmente" con el endpoint `/asignaciones`, los dos catálogos nuevos de asignaciones y el bloqueo por cualquiera de las tres dimensiones, y registra la versión actual **0.26.0**.

## [0.25.0] - 2026-09-27

### Added

- feat(ui-layout): Nuevo `BuscadorPersonaComponent` (`<ui-buscador-persona>`) exportado desde `@tesoreria/ui-layout`, buscador de personas compartido para todos los módulos que porta el mecanismo del legacy (`tesoreria.vb6`: `frmEstChequera.frm` → `frmSearchNew` → `clsREPPersona.collectionSearch`): el texto se parte en palabras (términos de mínimo 2 letras, hasta 4) y se envía como array JSON a `POST persona/search` del core —`LIKE` por término combinado con AND, tope fijo 50, sin filtro de facultades ni de usuario— con demora de 300 ms y reordenamiento por relevancia que ignora tildes (`ordenarSugerencias`). Componente OnPush sin estado de página: `texto` en doble vía (`model()`) con `effect` que refleja cambios externos en el campo sin re-consultar, inputs `label`/`placeholder`/`disabled`/`limite`/`inputId`, navegación por teclado (flechas con envoltura, Enter, Escape que cierra la lista), selección por doble clic o Enter sobre la opción resaltada que emite `seleccionada` y escribe "Apellido, Nombre" en el campo, y estados de carga, sin coincidencias, aviso de tope alcanzado y error que no bloquea la búsqueda siguiente. La base del core se deriva del token `API_URL` de la app quitando el sufijo `/auth`.
- feat(ui-layout): Helpers exportados en `persona-busqueda.ts`: `PersonaBusqueda`, proyección "lista blanca" de `PersonaKey` (`uniqueId`, `personaId`, `documentoId`, `apellido`, `nombre`) para que `cuit`, `cbu`, `password` y el campo `search` de la respuesta cruda no lleguen al estado ni a la UI, más `terminosBusqueda` y `normalizarPersonasBusqueda` (acepta lista cruda o envuelta como `{ content: [...] }` y descarta filas sin `personaId` o con `documentoId` inválido).
- feat(guarani): "Datos Personales" consulta alumnos por **apellido y nombre** con `<ui-buscador-persona>`: la persona elegida completa el número de documento (`personaId`) y lanza la consulta guaraní, equivalente al `fillPersona` del VB6; se mantiene la consulta directa por documento y escribir un documento a mano limpia el nombre de la persona buscada. La vista deja de usar `FormsModule` (enlace manual del input).
- docs: Nueva `docs/estrategia-buscador-persona.md` con la estrategia de porting de la búsqueda por palabras del legacy: referencias exactas de `tesoreria.vb6` (`txtPersona_KeyPress`, `collectionSearch`, `findSearch`/`fillPersona`), el contrato del backend (`PersonaController.findByStrings` sobre `vw_persona_key`, AND de `LIKE`, tope 50) y las decisiones de descartar el filtro por facultades y el `GET persona/sugerencias/usuario/{userId}`, y de usar el patrón de buscador de `ui-layout` en lugar de replicar la ventana modal `frmSearchNew`.
- test: Specs de `buscador-persona` (consulta con las palabras tras la demora, nada con menos de dos letras, selección por teclado y por click emitiendo sólo los campos seguros, Escape, aviso sin coincidencias y de tope, error que no bloquea la siguiente búsqueda, cambio externo del texto sin re-consultar, base derivada de `API_URL` y doble vía) y de `persona-busqueda` (términos desde "apellido, nombre", relevancia sin tildes con desempates, proyección lista blanca, listas envueltas y filas inservibles); nueva spec de `DatosPersonalesComponent` (render del buscador compartido, selección que completa documento y consulta, escritura manual que limpia el nombre, validación conservada).

### Changed

- refactor(externo-consulta): "Apellido y nombre" de `/chequeras` usa el `ui-buscador-persona` compartido y la vista eliminó su maquinaria de sugerencias propia: se quitan `ChequerasService.sugerirPersonas` (`GET persona/sugerencias/usuario/{userId}`), el modelo `PersonaSugerida`, el estado de sugerencias del store (`EstadoSugerencias`, `escribirNombre`, `cerrarSugerencias`, `MINIMO_SUGERENCIA`, demora interna de 300 ms) y el combobox con navegación por teclado del template; `elegirPersona` sigue completando documento, tipo de documento y nombre y ejecutando la búsqueda, y `terminosBusqueda`/`ordenarSugerencias` pasan de `chequeras.utils` a `@tesoreria/ui-layout`. Semántica de búsqueda alineada al legacy: global contra `POST persona/search` sin filtro de las facultades del usuario, desde 2 letras por término (antes 3 alfanuméricos) con tope de 50 (antes 8). Actualizadas las specs de store, servicio, utils, componente y rutas.
- docs: README agrega `buscador-persona` a los buscadores de `@tesoreria/ui-layout`, documenta la consulta por persona en guarani y actualiza la versión; `docs/architecture.md` suma `BuscadorPersonaComponent` al nodo `@tesoreria/ui-layout` y la relación `Datos Personales → BuscadorPersona Component` en el diagrama de Guaraní.

## [0.24.0] - 2026-09-26

### Added

- feat(shared-api): `LoginResponse` incorpora los flags del perfil devueltos por el backend (`administrador`, `usuarioExterno`, `activo`, `imprimeChequera`, `numeroOpManual`, `habilitaOpEliminacion`, `eliminaChequera`, `modificaChequera`, `lastLog`, `googleMail`), todos opcionales para tolerar sesiones guardadas antes del deploy. Nuevos helpers `esFlagActiva`, `esAdministrador` y `esUsuarioExterno` en `auth.flags.ts` (un único punto de parseo del contrato 1/0).
- feat(shared-api): Guards de acceso por módulo en `module-access.guard.ts`: `administradorGuard` habilita el app **administrador** sólo con `administrador = 1`, y `usuarioInternoGuard` bloquea los apps internos cuando `usuarioExterno = 1` (esos usuarios sólo operan **externo-consulta**). Si la sesión en storage aún no trae el flag (sesión previa al deploy o `/login` que devuelve sólo el token), la guardia **espera a `GET /me/:userId`** antes de decidir, en vez de evaluar datos viejos y bloquear la primera navegación; `administradorGuard` falla cerrado ante error de perfil y `usuarioInternoGuard` mantiene el comportamiento histórico. Ambas redirigen a la ruta pública `sin-acceso` y, sin sesión, a `/login` con `returnUrl`. Se exporta `SIN_ACCESO_RUTA` para registrar la ruta en cada app sin duplicar literales.
- fix(shared-api): `AuthService.getUser` deduplica la solicitud en curso (`shareReplay`) para que constructor, post-login y guards compartan un único `GET /me/:userId`, amplía la condición de persistencia del merge a respuestas con `userId` aunque no traigan `login`, y **excluye el `token` de `/me`** de la sesión: si el backend responde con un JWT de placeholder (p. ej. `dummy-jwt-token-replace-later`) no invalida el token real emitido por `/login`.
- feat(ui-layout): Nuevo `NoAccesoComponent` (`<ui-no-acceso>`), pantalla pública de "acceso restringido" con botón de cierre de sesión, registrada en las rutas `sin-acceso` de administrador, compras, pagos, chequeras, contable, contratados y guarani antes del wildcard (evita el bucle `/login ↔ ruta protegida` porque `LoginComponent` re-navega si hay sesión).
- feat(administrador): Nueva pantalla "Asignaciones" (`AsignacionUsuariosComponent`, ruta perezosa `/asignaciones` protegida con `[authGuard, usuarioInternoGuard, administradorGuard]` e ítem en el menú del shell) para asignar/desasignar sedes geográficas, clases de chequera y facultades a un usuario: búsqueda de usuarios vía `GET /usuario/search?q=` (mínimo 2 caracteres, `debounce` 300 ms) y checkboxes que aplican cada cambio de inmediato sobre los slices `usuarioChequeraGeografica` / `usuarioChequeraClaseChequera` / `usuarioChequeraFacultad` (GET/POST/DELETE) mediante el nuevo `UsuarioChequeraService`, con mensajes de éxito/error que se ocultan automáticamente a los 5 s.

### Changed

- feat(shared-api): La sesión se revalida contra `GET /auth/me/{userId}` al hidratar `localStorage` y también después de un `login` exitoso: el backend es la fuente de verdad de los flags de acceso y un `currentUser` alterado a mano se sobreescribe al arrancar la app (la defensa real sigue siendo la autorización 401/403 en el gateway, ya cubierta por `errorInterceptor`).
- feat(administrador): `dependencias`, `proveedores` y `gastos` exigen ahora `[authGuard, usuarioInternoGuard, administradorGuard]`.
- feat(apps): `compras`, `pagos`, `chequeras`, `contable`, `contratados` y `guarani` encadenan `usuarioInternoGuard` a sus rutas protegidas, preservando `guaraniSedePrincipalGuard` en su orden. `externo-consulta` permanece sin cambios.
- docs: `docs/architecture.md` actualiza el diagrama de secuencia de autenticación, el modelo `LoginResponse` y documenta las guards de acceso por módulo.
- test: Specs de `auth.flags`, `administradorGuard`/`usuarioInternoGuard` (permitido, bloqueado, flag ausente y sesión nula), de revalidación de sesión (flags adulterados en storage se sobreescriben con `/me` y `/login` hidrata flags), y de `NoAccesoComponent`.

## [0.23.0] - 2026-09-24

### Added

- feat(ui-auth): Nuevo `CambioClaveModalComponent` (`<lib-cambio-clave-modal>`) exportado desde `@tesoreria/ui-auth`: modal de cambio de clave autoatendido que precarga `login` y `nombre` de la sesión (si la sesión no tiene `login`, lo completa vía `AuthService.getUser`), valida campos de contraseña obligatorios y que `newPassword` coincida con `reClaveNueva`, rechaza cambios para cuentas cuyo `login` empieza con `admin`, muestra estado de carga, alertas de error (texto plano, `message` o genérico desde `HttpErrorResponse`) y de éxito ("Cambio REALIZADO") con autocierre; publica `closed` al cerrar por backdrop, botón X o "Salir" y resetea el formulario cada vez que se abre.
- feat(shared-api): `AuthService.changePassword(data)` (`POST auth/change-password`) que fusiona la respuesta con la sesión existente (conserva el token si la respuesta no trae uno) y actualiza `currentUser` en el storage, `currentUser$` y `currentUserSignal`. Nuevo modelo `ChangePasswordRequest` y campo opcional `login` en `LoginResponse`.
- feat(shared-api): `AuthService.getUser(userId)` (`GET auth/me/{userId}`) que refresca la sesión con los datos completos del usuario; el `login` de las credenciales se persiste en la sesión al hacer `login` cuando la respuesta no lo trae, y la rehidratación desde storage pide el perfil si el usuario guardado no tiene `login`.
- feat(ui-layout): `ui-shell` suma el botón "Cambiar clave" junto a logout en el sidebar de escritorio y en el header móvil, y renderiza `lib-cambio-clave-modal` controlado por la señal `isCambioClaveOpen`. Para esto `@tesoreria/ui-layout` pasa a depender de `@tesoreria/ui-auth` (misma `type:ui`/`scope:shared`).
- test: Specs de `cambio-clave-modal` (render condicionado a `isOpen`, precarga de datos, validación de coincidencia de claves, bloqueo de cuentas `admin`, éxito con mensaje y cierre, errores del backend y evento `closed`), de `auth.service` (`changePassword` actualiza sesión y storage) y de `ui-shell` (apertura y cierre del modal desde el sidebar).

### Changed

- chore(apps): Los `index.html` de las ocho aplicaciones estandarizan `lang="es"`, doctype en minúsculas y títulos legibles `"<Módulo> - Tesorería"`.
- refactor(externo-consulta): La raíz deja de pasar `logoUrl="/logo.png"` al shell y usa la marca de texto "UM · Tesorería" como el resto de las apps.
- docs: README y `docs/architecture.md` reflejan la dependencia `ui-layout → ui-auth` (modal de cambio de clave en el shell) y amplían los modelos de autenticación (`login` en `LoginResponse`, `getUser`/`changePassword` en `AuthService`, `ChangePasswordRequest`).

## [0.22.0] - 2026-09-24

### Added

- feat(ui-layout): Nuevo `UiShellComponent` (`<ui-shell>`), shell J2 de todas las aplicaciones que reemplaza la composición navbar + sidebar: sidebar oscuro con marca (texto "UM · Tesorería" o logo institucional vía `logoUrl`) y nombre del módulo, menú (`ShellMenuItem[]` con `label` y `path`, resaltado del ítem activo y `exact` en la raíz), badge de entorno con color por ambiente y tooltip con la versión, usuario con sede y logout que limpia la sesión y navega a `/login`. En pantallas chicas muestra un header compacto y pestañas de navegación horizontales; sin sesión solo renderiza el `router-outlet`.
- feat(ui-layout): Utilidades de componentes del tema J2 en `tokens.css`: nuevos tokens `--color-um-primary-hover` y `--color-um-btn-border`, base del `body` con tipografía y color de tinta UM, y clases en `@layer components` para los patrones repetidos: `.um-page-header`, `.um-eyebrow`, `.um-page-title`, `.um-page-desc`, `.um-section`, `.um-label`, `.um-input` (con `.um-input-invalid`), `.um-btn-primary`, `.um-btn-secondary`, `.um-link-btn`, `.um-alert` (+ `-error`/`-warn`/`-success`), `.um-card`, `.um-badge` y `.um-table` (encabezado, celdas y hover de filas). Las vistas usan estas clases en lugar de cadenas largas de utilities, y la paleta `um-*` es la única fuente de colores.
- test(ui-layout): Spec de `ui-shell` que cubre la marca con y sin `logoUrl`, el menú del sidebar con su etiqueta de sección, el badge de entorno (etiqueta, tooltip con versión, rojo para entornos desconocidos y ausencia sin `APP_ENV_INFO`), el usuario y su sede, el logout que limpia la sesión y navega, y el `router-outlet` pelado cuando no hay sesión.

### Changed

- refactor: Las raíces de las ocho aplicaciones (administrador, chequeras, compras, contable, contratados, guarani, pagos y externo-consulta) ahora solo renderizan `<ui-shell>` con su marca, nombre de módulo y menú; se eliminan las composiciones inline duplicadas y los `app.css` vacíos. Externo-consulta migra su sidebar piloto (con `/logo.png`) al shell compartido.
- refactor(ui-layout): Eliminados `NavbarComponent`, `SidebarComponent` y `UiLayoutComponent` con sus templates, CSS vacíos y specs; el badge de entorno pasa del navbar a `ui-shell` con estilo de anillo y color por ambiente. El `index.ts` exporta ahora el shell y los dos buscadores (`buscador-cuenta-contable`, `buscador-proveedor`).
- design: Migración a J2 del login (`ui-auth`) y de las vistas de las librerías de features (proveedores, gastos, orden de compra en sus tres vistas, buscador de cuenta, buscador contable y buscador de proveedor) y de las vistas de las apps (dependencias, facturas pendientes, welcome de chequeras, beneficios/ubicaciones/datos personales y pendientes pre-guaraní de guarani, chequeras y su modal de detalle en externo-consulta): se reemplazan colores sueltos (azules/grises) y cadenas largas de utilities por tokens y clases `um-*`, con formateo Prettier de los templates.
- docs: README documenta el sistema de diseño J2 (tokens, shell, utilidades y la vista de chequeras de externo-consulta como referencia viva) y actualiza el diagrama de arquitectura; `docs/architecture.md` reemplaza `NavbarComponent`/`SidebarComponent` por `UiShellComponent` en el nodo de `ui-layout`; AGENTS.md añade la convención de diseño UI (tema J2, `tokens.css`, `<ui-shell>`, clases `um-*`).

## [0.21.0] - 2026-09-24

### Added

- feat(externo-consulta): Nueva vista `/chequeras` ("Estado de Chequeras") para personal administrativo: consulta de chequeras de alumnos de las facultades asignadas al usuario, con el lenguaje visual de guarani y el orden de la pantalla "Estado de Chequera" del sistema de escritorio. Se busca por número y tipo de documento, por apellido y nombre con sugerencias mientras se escribe (a partir de 3 letras o dígitos sin contar signos, como exige el core; ordenadas por relevancia y navegables con teclado; si el core igual responde 400, la lista queda vacía en lugar de mostrar un error), o por número de chequera (`facultad/tipo/serie` o `facultad/serie`, sólo de facultades asignadas). El lectivo por defecto es el vigente según sus fechas (`lectivo/last` devuelve el próximo). Consume `GET chequeraSerie/usuario/{userId}/lectivo/{lectivoId}`, que devuelve sólo las chequeras de las facultades asignadas al usuario en `usuario_chequera_facultad`. Muestra titular, deuda vencida total, filtro local por unidad académica, tarjetas "Todas" / "Con deuda vencida", número de chequera como `facultad/tipo/serie` y paginación con "Ver más".
- feat(externo-consulta): Modal de detalle de chequera con tarjeta de deuda (`chequeraCuota/deuda`; el centinela de chequera inexistente se muestra como "Deuda no disponible") y cuotas con los campos del reporte "Estado de Chequera": agrupadas por producto, con Cuota n/total, Período, A pagar, Fecha de pago, Pagado con referencia (archivo o tipo de pago) y subtotales de producto, pagado y deuda (la deuda es el saldo de cada cuota impaga, así un recargo pagado en una cuota no descuenta deuda de otras). El "Primer vencimiento adeudado" sale de la primera cuota vencida e impaga, porque `vencimiento1`/`importe1` de `chequeraCuota/deuda` son de la primera cuota de la chequera aunque esté pagada. Cada cuota muestra su estado (Pagada, Pendiente, Vencida desde el primer vencimiento, Baja, Compensada y "A definir" para cuotas impagas con importe 0, como el arancel de diciembre a febrero antes de fijarse su importe) y se resalta la próxima. La única descarga es "Estado (PDF)" (`chequera/generateEstadoPdf/.../{debitoTipoId}` con débito directo por CBU, `debitoTipoId = 2`); es un endpoint nuevo del core que hasta publicarse responde 404, y la vista lo informa. Se cierra con Esc o con click en el fondo, mantiene el foco adentro y lo devuelve al botón que lo abrió.
- feat(externo-consulta): Formato `es-AR` (`LOCALE_ID`) para montos en pesos. Las fechas se muestran por día calendario para que un vencimiento en UTC no se corra un día.
- test(externo-consulta): Specs de utilidades de fechas y estados, focus trap, servicio (URLs, parámetros y blob del PDF de estado), store de búsqueda (cancelación, errores que no cortan búsquedas siguientes, paginación, filtro local, sugerencias por nombre con demora, mínimo de 3 letras o dígitos ("pe j", "o'r") y 400 como lista vacía, y búsqueda por número de chequera), componente (combobox navegable con teclado), modal (respuestas tardías de otra chequera, PDF inválido o con error) y rutas.

### Changed

- refactor(externo-consulta): La raíz y las rutas desconocidas redirigen a `/chequeras` (carga diferida con `authGuard`). Se eliminan el ítem "Inicio" y `BlankComponent`.
- design: La vista de chequeras usa la dirección J2 y los tokens compartidos de color, tipografía y espaciado, disponibles para las ocho aplicaciones.
- docs: README documenta la vista, cómo probarla localmente y la limitación de seguridad; la versión del README se actualiza a 0.21.0.

### Fixed

- fix(auth): El login muestra un error legible ante credenciales incorrectas, conserva la ruta de regreso y redirige a usuarios con sesión activa; los errores de otras solicitudes mantienen el `returnUrl` al volver al login.
- fix(externo-consulta): Una búsqueda por documento limpia el error anterior de búsqueda por número de chequera; los textos de ayuda mantienen el tratamiento de usted.

### Requisitos

- La vista requiere un core que incluya el commit `43ada0cb` (rama `feat/chequeras-por-usuario-y-sugerencias`, todavía sin mergear en `develop`), que agrega `chequeraSerie/usuario/{userId}/lectivo/{lectivoId}` y `persona/sugerencias/usuario/{userId}`. Con un core anterior, la búsqueda y las sugerencias responden 404.
- "Estado (PDF)" depende de `chequera/generateEstadoPdf/...`, que el core todavía no publicó. Hasta entonces el botón informa que el PDF no está disponible.

### Security

- El filtro por facultad depende del `userId` que envía el frontend y que hoy nadie verifica contra la sesión. No exponer la vista a usuarios externos reales hasta que el gateway vincule el `userId` a la sesión.
- Las sugerencias por nombre usan `GET persona/sugerencias/usuario/{userId}`, acotado en el core a las facultades del usuario y con campos mínimos. Hereda la misma limitación: el `userId` no se verifica contra la sesión.

## [0.20.0] - 2026-09-22

### Added

- feat(externo-consulta): Añadida la aplicación `externo-consulta` (puerto 4208) como módulo de consulta para usuarios externos: login con `@tesoreria/ui-auth`, ruta raíz protegida por `authGuard` con `BlankComponent` como contenedor, layout con `ui-navbar`/`ui-sidebar`, `Dockerfile`, `entrypoint.sh`, `nginx.conf` y proyectos de lint/test propios.
- feat(ui): Indicador de entorno en el navbar de `@tesoreria/ui-layout`: badge de color junto al nombre del usuario (LOCAL gris, DESARROLLO ámbar, STAGING violeta, PRODUCCIÓN verde, SIN DEFINIR rojo) cuyo tooltip expone `Entorno | Versión`. Solo se renderiza cuando `APP_ENV_INFO` está proveído.
- feat(shared-api): Añadida la API pública `env` (`libs/shared-api/src/lib/env.ts`): token `APP_ENV_INFO`, `provideAppEnvInfo` (provee la info y prefija el `document.title` con la etiqueta del entorno) y `getEnvDisplay`, que normaliza mayúsculas, espacios y guiones bajos y acepta sinónimos (`prod`, `dev`, `desarrollo`, `preproduccion`, `localhost`, etc.), devolviendo `unknown`/`SIN DEFINIR` para valores ausentes o no reconocidos.
- feat(deploy): Los `entrypoint.sh` de las ocho aplicaciones reemplazan ahora los placeholders `ENV_NAME_PLACEHOLDER` y `APP_VERSION_PLACEHOLDER` en los `.js` compilados con las variables de entorno `ENV_NAME` y `APP_VERSION` del contenedor; si la variable no está definida se inyectan `desconocido`/`sin-version` para evidenciar despliegues mal configurados con el badge rojo. La lógica de reemplazo se factorizó en la función `replace_placeholder`.
- feat(environments): Los `environment.ts` de producción de todas las apps exponen `env` y `version` sobre los placeholders, y los `environment.development.ts` fijan `env: 'local'` y `version: 'dev'`.
- build: Añadido `fileReplacements` a la configuración `development` de los `project.json` de las ocho aplicaciones para que `nx serve` use el `environment.development.ts` correspondiente.
- test: Añadida la spec de `getEnvDisplay` (mapeos, sinónimos, normalización de separadores y valores desconocidos/nulos) y extendida la spec de `NavbarComponent` para cubrir el badge (etiqueta, tooltip con versión, entorno desconocido en rojo) y su ausencia sin `APP_ENV_INFO`.
- ci: Las matrices de `docker-publish.yml`, `deploy-develop.yml` y `deploy-staging.yml` incluyen `externo-consulta`; el diagrama de arquitectura del workflow de documentación suma el nodo `externo-consulta :4208` con su conexión al gateway.

### Changed

- chore: `npm run serve:all` levanta ahora también `externo-consulta` en el puerto 4208.
- docs: README y AGENTS.md documentan la nueva aplicación, su puerto y su Dockerfile; el diagrama Mermaid del README incluye el nodo `EC` con sus dependencias a API, AUTH y LAYOUT.

## [0.19.0] - 2026-09-14

### Added

- feat(guarani): El modal de Datos Personales acepta ahora la entrada `persona` (`DatosPersonalesAlumno`), por lo que se puede abrir directamente desde la lista de Pendientes Pre Guaraní con el objeto de la persona sin volver a consultarla por documento.
- feat(guarani): El campo "Documento" del modal muestra el tipo como `descripción (abreviatura)` combinando `descripcion` y `descAbreviada` de `tipoDocumentoRel`, con fallback a cada valor por separado y `-` cuando ambos ausentan (`tipoDocumentoEtiqueta`).
- feat(guarani): La captura de datos personales processa ahora respuestas por alumno (`CreatePersonalesResponse[]` con `result`): mensaje de éxito si todos son correctos, aviso parcial con conteo (`X de Y alumnos`), error si ninguno se completó y mensaje distinto cuando no se encontraron alumnos. Tras un resultado total o parcial se recargan los datos.
- feat(guarani): El documento del buscador de Datos Personales admite letras y números (validación `^[0-9a-zA-Z]+$`) en lugar de solo dígitos; se eliminó el `inputmode="numeric"`.
- test(guarani): Añadidas pruebas de `DatosPersonalesService` (URLs de captura/preuniversitario, normalización de respuestas nulas, vacías o de objeto único y eliminación de elementos nulos) y de `DatosPersonalesModalComponent` (escenarios de captura total/parcial/nula/fallida, recarga tras crear preuniversitario y renderizado de `tipoDocumentoEtiqueta`).

### Changed

- feat(guarani): Tras crear el preuniversitario con éxito el modal recarga los datos del alumno automáticamente.
- refactor(guarani): Las URLs del `DatosPersonalesService` se construyen desde una `baseUrl` común y las respuestas de `capturar`/`crearPreuniversitario` se estandarizan con `normalizarLista`, que convierte `null` u objeto único en arreglo.
- refactor(guarani): `PropuestaAspira.personaRel` en Pendientes Pre Guaraní usa ahora el modelo `DatosPersonalesAlumno` en lugar de una estructura inline duplicada.

## [0.18.0] - 2026-09-04

### Added

- feat(guarani): Añadido el filtro obligatorio "Año académico" en Pendientes Pre Guaraní: entrada numérica de máximo 4 dígitos con saneo de caracteres no numéricos, se persiste en la sesión junto al resto de filtros y se añade al final de la consulta como `/anio/academico/{anio}`.
- feat(guarani): Añadida la columna "Año académico" en la tabla de resultados de Pendientes Pre Guaraní, a partir del nuevo campo opcional `anioAcademico` de `PropuestaAspira`.
- feat(guarani): Añadida la acción "Crear Preuniversitario" en el modal de Datos Personales, que invoca `GET /generate/preuniversitario/create/{documento}` y muestra mensajes de éxito o error. La función queda temporalmente deshabilitada (`preuniversitarioHabilitado = false`) durante su validación.
- test(guarani): Añadidas pruebas de Pendientes Pre Guaraní para la URL con año académico, el bloqueo de la consulta sin año académico y el descarte de caracteres no numéricos en el filtro.

### Changed

- feat(ui): Renombrada la etiqueta "Ciclo lectivo" a "Ciclo lectivo Chequera" en la sección de resultados de Pendientes Pre Guaraní.

### Fixed

- fix(deploy): Los `nginx.conf` de las siete aplicaciones usan ahora el resolver DNS interno de Docker (`127.0.0.11` con TTL de 10 s) y un `proxy_pass` dinámico sobre `$request_uri` para el proxy `/api/` al gateway, de modo que el nombre `tesoreria-gateway-service` se resuelve en cada petición y no queda cacheado tras reinicios del gateway.

## [0.17.1] - 2026-08-24

### Changed

- chore(ci): Ajustada la estrategia de tags Docker en los workflows de `develop` y `staging` para usar `type=raw,value=${{ github.sha }}` en lugar de `type=sha`, garantizando el uso del SHA completo del commit.

## [0.17.0] - 2026-08-24

### Added

- feat(ci): Añadidos workflows de despliegue automatizado para los entornos `develop` y `staging`. Cada pipeline verifica la aplicación (lint, test y build de todas las apps con Nx), construye las imágenes Docker de las siete aplicaciones, las publica en Docker Hub con tag de commit y las despliega en runners self-hosted mediante scripts de infraestructura.

## [0.16.0] - 2026-08-10

### Added

- feat(guarani): Datos Personales disponible para todas las sedes: la ruta `/datos-personales` ya no exige sede principal y el menú de las sedes secundarias lo incluye junto a Pendientes Pre Guaraní.

### Changed

- test(guarani): Actualizadas las pruebas del menú para cubrir el acceso de las sedes secundarias a Datos Personales.

### Fixed

- fix(guarani): La captura de datos personales apunta al endpoint del backend `/generate/personales/create/{documento}` en lugar de `/generate/personales/documento/{documento}`.

## [0.15.0] - 2026-08-08

### Added

- feat(guarani): Añadido control de acceso y filtrado de ubicaciones por `geograficaId` para limitar las opciones administrativas a la sede principal.
- test(guarani): Añadidas pruebas para el menú por sede, el guard de navegación y la carga de pendientes.

### Changed

- feat(guarani): Persistidos los filtros de pendientes en la sesión y restaurados al volver a la pantalla.
- fix(guarani): Robustecida la consulta de pendientes ante respuestas vacías, inválidas, lentas o con errores HTTP.
- refactor(auth): Ampliado `LoginResponse` con el identificador geográfico opcional de la sede.

## [0.14.2] - 2026-08-07

### Changed

- test: Actualizadas las pruebas de aplicaciones y componentes para usar los nombres y componentes standalone actuales.
- chore(ui-auth): Corregidas las rutas relativas de configuración, salida de compilación, caché y cobertura de la librería.

## [0.14.1] - 2026-08-07

### Changed

- refactor(ui): Migradas las vistas compartidas y de gestión al control flow moderno de Angular.
- style(ui): Actualizados los templates y reglas de lint para mantener el formato y los selectores de componentes consistentes.

### Fixed

- fix(ui): Mejorada la interacción por teclado y el cierre de modales y menús desplegables.

## [0.14.0] - 2026-08-07

### Added

- feat(guarani): Añadida la consulta de beneficios junto con los datos personales y la visualización del porcentaje asociado a cada requisito presentado.

### Changed

- chore(release): Sincronizadas las versiones de `package.json` y `package-lock.json` para que la instalación con `npm ci` del pipeline de GitHub sea reproducible.

## [0.13.1] - 2026-08-06

### Fixed

- fix(guarani): Limpia la búsqueda, selección y resultados de chequera al cambiar de propuesta, facultad o ubicación, y después de guardar una asociación.

## [0.13.0] - 2026-08-06

### Added

- feat(auth): Añadidos interceptores compartidos para enviar el token Bearer y gestionar respuestas 401/403.
- test(auth): Añadidas pruebas del interceptor de autenticación para solicitudes con y sin token.
- feat(ci): Añadida validación de lint, tests y builds de proyectos afectados en Pull Requests hacia `main`.

### Changed

- refactor(auth): El estado de sesión ahora se expone también mediante signals para el interceptor y el guard.
- refactor(routes): Login y funcionalidades compartidas se cargan de forma lazy en las aplicaciones configuradas.
- refactor(docker): Los Dockerfiles pasan a ser imágenes Nginx runtime-only; el build de Nx se ejecuta previamente y sus artefactos se reutilizan en la publicación.
- refactor(ci): El pipeline de imágenes construye las siete aplicaciones, comparte los artefactos `dist/apps` y publica la matriz incluyendo `guarani`.
- feat(guarani): Los resultados de pendientes muestran el porcentaje de beneficio asociado a la chequera.
- docs: Actualizados README, arquitectura Mermaid, versión y referencias al pipeline de documentación.

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
