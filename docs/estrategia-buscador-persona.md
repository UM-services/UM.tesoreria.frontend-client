# Estrategia: Buscador de Personas compartido (búsqueda por "palabras" del legacy)

> Objetivo: reemplazar el buscador de personas de la ruta `/chequeras` del módulo
> `externo-consulta` —que hoy filtra por facultades del usuario— por el **mismo
> mecanismo de búsqueda del legacy** (`tesoreria.vb6`, `frmEstChequera.frm` →
> `frmSearchNew` → `clsREPPersona.collectionSearch`): **buscar por palabras contra
> `POST persona/search`, sin ningún filtro de facultades**. Lo que se porta es la
> **semántica de búsqueda**, no la estética VB6.
>
> Alcance: un único componente compartido (`ui-buscador-persona`) que sirve como
> buscador de personas **en todos los módulos de tesoreria-frontend**.

**Correcciones respecto del primer borrador de esta estrategia** (por observaciones
del usuario):

1. **Sin filtro de facultades**: se descarta `GET persona/sugerencias/usuario/{userId}`
   (que restringe a personas con chequeras en las facultades asignadas). Todos los
   módulos buscan contra `POST persona/search`, que es global — igual que el VB6.
2. **Sin réplica visual del modal legacy**: la ventana `frmSearchNew` se reemplaza
   por el patrón de buscador que el repo ya usa en `ui-layout`
   (`buscador-proveedor`: input + dropdown de resultados con búsqueda por palabras).
   La identidad con el legacy está en el **query** (palabras → AND LIKE), no en la
   ventana modal.

---

## 1. Qué se "reutiliza" del legacy: la búsqueda por palabras

Referencia exacta en `tesoreria.vb6`:

- `frmEstChequera.frm`, `txtPersona_KeyPress` (líneas 1037-1045): cualquier tecla en
  el campo "Persona" abre `personaRep.formSearch(frmSearchNew, KeyAscii, "Personas")`.
- `frmSearchNew.frm`, `txtCadena_Change`: **con cada pulsación** se ejecuta
  `vRepository.collectionSearch(Me.txtCadena.Text)` y la lista se rellena con
  `textFound` = `"Apellido, Nombre (personaId.documentoId)"` (`clsMODPersona.cls`,
  líneas 88-130).
- `clsREPPersona.collectionSearch` (líneas 340-368) — **esto es lo que se porta**:

  ```vb
  chains = Split(chain, " ")            ' la cadena en palabras
  ...
  url = modconfiguration.url_tesoreria & "persona/search"
  request.Open "POST", url              ' JSON array de palabras
  request.send jsontext
  ```

- Backend (`tesoreria-core`): `PersonaController.findByStrings(@RequestBody
  List<String> conditions)` → `List<PersonaKey>`. SQL sobre `vw_persona_key`: un
  `LIKE '%palabra%'` por término combinado con **AND**, orden por apellido/nombre,
  **tope fijo 50** (`PersonaKeyRepositoryCustomImpl`). Sin usuario, sin facultades.
- Confirmación: doble clic o Enter sobre una fila → `findSearch(uniqueId)`
  (GET `persona/{uniqueId}`); el formulario entonces `fillPersona` y sigue.
- Campo hermano: `txtPersonaID_KeyPress` con Enter busca directo por documento
  (`persona/bypersonaId`) — en la web eso ya existe como el input "Número de
  documento" y queda intacto.

**En una frase:** *texto libre → dividir en palabras → POST al core que busca
personas en toda la base por AND de palabras (≤50 filas) → el usuario elige una →
el formulario la consume.* Eso, y sólo eso, es el contrato del nuevo buscador.

## 2. Qué hace hoy `/chequeras` (externo-consulta) y por qué no sirve

- Combobox inline sobre "Apellido y nombre": debounce 300 ms, **mínimo 3 caracteres**,
  **máximo 8** sugerencias.
- Llama a `GET persona/sugerencias/usuario/{userId}?q=...` — endpoint que **filtra por
  las facultades asignadas al usuario** (el core lo restringe vía
  `usuario_chequera_facultad`). Para un buscador de propósito general eso es un
  defecto, no una función: no permite encontrar cualquier persona.
- La lógica de teclado/fetch está a mano en el componente y no es reutilizable.

## 3. Diseño: `ui-buscador-persona` (componente único para todos los módulos)

### 3.1 Estructura

```
libs/ui-layout/src/lib/buscador-persona/
├── buscador-persona.ts          // standalone, signals, input()/output() tipados
├── buscador-persona.html        // input + dropdown de resultados (patrón buscador-proveedor)
├── buscador-persona.spec.ts     // Vitest
└── persona-busqueda.ts          // PersonaBusqueda + terminosBusqueda/ordenarSugerencias/mapeo
```

Sigue el precedente interno de `buscador-proveedor` (que ya hace exactamente este
mecanismo contra `proveedor/search`: `term.split(/\s+/)` + POST), y `ui-layout` ya
es la lib donde viven los buscadores. Exportado desde `libs/ui-layout/src/index.ts`.

### 3.2 Contrato (implementado)

```ts
/** Fila del buscador: proyección (lista blanca) de PersonaKey. */
export interface PersonaBusqueda {
  uniqueId: number;
  personaId: string;          // número de documento (DNI, LC, ...)
  documentoId: number;        // tipo de documento
  apellido: string;
  nombre: string;
}

@Component({ selector: 'ui-buscador-persona', standalone: true })
export class BuscadorPersonaComponent {
  readonly texto = model('');                      // doble vía con el formulario
  readonly label = input('');                      // texto del <label> (opcional)
  readonly placeholder = input('Buscar por apellido o nombre...');
  readonly disabled = input(false);
  readonly limite = input(50);                     // tope del backend
  readonly inputId = input('buscador-persona-N');  // id del input (a11y / selects)
  readonly seleccionada = output<PersonaBusqueda>();
}
```

- **El componente hace el fetch**: `POST {coreBaseUrl}/persona/search` con el array
  de palabras, `debounceTime(300)` + `distinctUntilChanged` + `switchMap` (la
  petición vieja se cancela). Tipado estricto, signals y OnPush.
- `coreBaseUrl`: derivado del token `API_URL` que ya provee cada app (`.../core/auth`
  → `.../core`, la misma técnica de `ChequerasService`); con fallback
  `/api/tesoreria/core` para no hardcodear como `buscador-proveedor`.
- **División en palabras**: semántica del `Split(chain, " ")` del VB6, refinada por
  `terminosBusqueda()` (`chequeras.utils.ts`: split por espacios/comas, términos ≥2,
  máx 4), portada a `persona-busqueda.ts` de la lib; el backend hace AND por término.
- **Sin piso de 3 caracteres**: `persona/search` acepta desde un término de 2 letras
  (el `MINIMO_SUGERENCIA = 3` existía sólo por el endpoint de sugerencias). Con
  debounce de 300 ms y tope 50 el costo está acotado.
- **Mapeo seguro**: `persona/search` responde `PersonaKey` completo — que incluye
  `cuit`, `cbu`, `password` — y `normalizarPersonasBusqueda()` **sólo lee** `uniqueId`,
  `personaId`, `documentoId`, `apellido`, `nombre`. El objeto crudo no llega al
  estado ni al `output`.
- **Relevancia local**: `ordenarSugerencias()` (portado a la lib, genérico sobre
  `{ apellido, nombre }`) reordena las ≤50 filas: prefijo de apellido primero,
  sin tildes. El nombre del tipo de documento no lo trae la búsqueda; la fila muestra
  `"Apellido, Nombre"` + `personaId.documentoId` (equivalente exacto del `textFound`
  del VB6).

### 3.3 Interacción (hereda la semántica legacy, con UI web estándar)

| Legacy | Web |
|---|---|
| Tecla en el campo abre ventana de búsqueda | Teclado/mouse abren el dropdown del combobox |
| Búsqueda en cada `Change` (Firebird local) | Búsqueda en cada tecla con debounce (HTTP) |
| `Split(chain," ")` → POST `persona/search` | Ídem, mismo body: array de palabras |
| ≤50 filas, orden apellido/nombre | ≤50 filas en el dropdown; aviso "muestre 50, refine la búsqueda" si se alcanza el tope |
| Enter/doble clic confirma | Click o Enter en la fila resaltada confirma; ↑/↓ mueven resaltado; Esc cierra (patrón ya implementado en `chequeras.component.ts`) |
| Tras confirmar, `fillPersona` + continuar | `(seleccionada)` → el host hace su `fillPersona` |
| Foco vuelve al formulario | El combobox conserva el foco tras seleccionar |

## 4. Integración en `/chequeras` (externo-consulta) — Fase 1

Puntos de contacto reales:

1. **Template** (`chequeras.component.html`, bloque `personaNombre`): se sacaron el
   `<ul>` de sugerencias, el spinner "Buscando..." y los handlers
   `(input)="alEscribirNombre"`, `(keydown)="alPresionarEnNombre"`,
   `(blur)="store.cerrarSugerencias"`. En su lugar, el combobox compartido:

   ```html
   <ui-buscador-persona
     label="Apellido y nombre"
     inputId="personaNombre"
     [(texto)]="store.nombre"
     (seleccionada)="store.elegirPersona($event)"
   />
   ```

   `ChequerasComponent` perdió `activa`, `personasSugeridas`, `listaAbierta`,
   `alEscribirNombre`, `alPresionarEnNombre`, `elegir()` y `tipoDocumento()`.
2. **Store** (`chequeras-busqueda.store.ts`): eliminados `EstadoSugerencias`,
   `textoNombre$`, `sugerir()`, `cerrarSugerencias()` y `MINIMO_SUGERENCIA`.
   `elegirPersona(persona: PersonaBusqueda)` fija `dni` (personaId), `documentoId`
   si está en el catálogo, escribe "Apellido, Nombre" y llama `buscar()` —
   exactamente el `fillPersona` del VB6 (líneas 1040-1043 de `frmEstChequera.frm`).
   `nombre` queda como señal en doble vía con el buscador (el titular de los
   resultados y la limpieza al cambiar el DNI siguen funcionando como antes).
3. **Servicio** (`chequeras.service.ts`): borrado `sugerirPersonas()`; el fetch vive
   ahora dentro del buscador (`persona/search`).
4. **Utils**: `terminosBusqueda` y `ordenarSugerencias` se movieron a la lib
   (`persona-busqueda.ts`, genérica sobre `{ apellido, nombre }`);
   `contarAlfanumericos` se eliminó (sólo existía para el mínimo de 3 del endpoint
   de sugerencias). Los casos de prueba migraron a `persona-busqueda.spec.ts`.
5. **Tests**: `buscador-persona.spec.ts` (debounce, cuerpo POST = array de palabras,
   selección por click/Enter/Esc, tope 50, error, doble vía, derivación de `API_URL`)
   y `persona-busqueda.spec.ts`; adaptados `chequeras.component.spec.ts` (test de
   integración teclado con el buscador), `chequeras-busqueda.store.spec.ts` (bloque
   "selección de persona") y `chequeras.service.spec.ts` (fuera el test de sugerencias).

## 5. Rollout a todos los módulos — Fase 3 (en curso)

Estado real del workspace al aplicar esta fase:

- **`guarani`** ✅: `datos-personales` ya pide una persona (antes sólo por número de
  documento). Se integró `ui-buscador-persona` encima del input de documento: elegir
  una persona del buscador completa `documento` (personaId) y lanza la consulta — el
  `fillPersona` del VB6 aplicado al módulo. El input quedó con `[value]` + `(input)`
  (en lugar de `ngModel`) porque la propiedad se modifica por programa al seleccionar,
  y el buscador se usa **unidireccional** en este host: el padre no espeja el texto
  (lo lee/escribe vía `viewChild` para limpiarlo al tipear documento), evitando el
  doble-escritor del binding `[(texto)]`.
- **`externo-consulta`** ✅ (Fase 2): `chequeras` usa `[(texto)]="store.nombre"` en
  doble vía porque el store sí necesita sincronizar el titular de los resultados en
  el campo; la escritura repetida con el mismo valor está deduplicada por la señal.
- **`chequeras` (interno), `compras`, `pagos`, `contable`, `contratados`**: hoy sus
  vistas son shells/placeholder (`nx-welcome`/`blank.component`); no existe todavía
  ningún formulario que pida una persona. Cuando se construyan, usan directamente
  `<ui-buscador-persona>` desde `@tesoreria/ui-layout` sin escribir búsqueda propia.
- **`administrador`**: `dependencias` pide cuentas contables (su buscador propio queda
  intacto) y `asignacion-usuarios` gestiona **usuarios internos** (`userId`, no
  personas): fuera del alcance del buscador de personas.

Donde un módulo necesite **rehidratar** la persona completa tras elegir, lo hace con
`GET persona/{uniqueId}` (equivalente al `findSearch` del VB6) — ese fetch **no**
pertenece al componente.

Consecuencia para el core/seguridad: el buscador expone resultados globales también
en el portal externo. Eso es intención del requerimiento ("que me sirva para todo
uso"). La atenuación correcta es **backend** (DTO de `persona/search` sin campos
sensibles; ver riesgo 2), no un filtro de facultades en el buscador.

## 6. Riesgos y notas

1. **Carga**: una sola letra dispara un LIKE sobre toda `vw_persona_key` (tope 50).
   Es exactamente lo que hacía el VB6 con cada tecla; con debounce 300 ms +
   `switchMap` el volumen queda acotado. Si se observa presión en el core, subir el
   debounce a 300-400 ms (constante dentro del componente) — no cambiar el contrato.
2. **`PersonaKey` lleva campos sensibles** (`cuit`, `cbu`, `password`) en la
   respuesta cruda. Mitigación frontend: proyección a `PersonaBusqueda` (lista
   blanca) siempre. Mitigación de fondo (backlog backend): reemplazar la respuesta
   por un DTO mínimo. Mientras el backend no cambie, el riesgo existe igual que en
   el VB6 — no es una regresión de este diseño.
3. **Sin paginación**: el tope de 50 filas es fijo. Para el buscador de personas
   universal alcanza (el legacy tampoco paginaba); si algún flujo necesita listar
   por página, será otro endpoint, no este componente.
4. **Rendimiento del dropdown**: 50 filas es trivial para renderizar; no hace falta virtualizar.
5. **Convención Nx**: el componente queda en `ui-layout` (`type:ui, scope:shared`);
   las apps lo importan por `@tesoreria/ui-layout`. No crear una lib nueva: ya hay
   dos buscadores en esa lib y el grafo de dependencias lo permite.
6. **El resto del formulario `/chequeras` no se toca**: DNI + tipo + lectivo +
   buscar por número de chequera siguen igual.

## 7. Plan por fases y validación

| Fase | Entrega | Verificación |
|---|---|---|
| 0 | Este documento, aprobado | — |
| 1 ✅ | `ui-layout`: `PersonaBusqueda` + utils portadas + `BuscadorPersonaComponent` + spec; export en `src/index.ts` | `npx nx test ui-layout && npx nx run ui-layout:lint` — 30 tests en verde |
| 2 ✅ | Integración en `externo-consulta/chequeras`: reemplazo del combobox, retiro de `sugerir()`/`sugerirPersonas()`/`persona/sugerencias` en el frontend | `npx nx test externo-consulta && npx nx run externo-consulta:lint && npx nx build externo-consulta` — 105 tests, build 407 kB |
| 3 🚧 | Rollout app por app (cada una en su PR) — hecho: `guarani/datos-personales`; sin objetivos hoy en `chequeras`/`compras`/`pagos`/`contable`/`contratados` (vistas shell) y `administrador` (usa usuarios/cuentas, no personas) | `npx nx run <app>:lint && npx nx test <app> && npx nx build <app>` — guarani: 40 tests, lint y build en verde |
| 4 | (Backlog backend) DTO seguro para `persona/search` | ITs de tesoreria-core |

Presupuestos: bundle inicial 500 kB warning / 1 MB error; estilos por componente
4 kB warning / 8 kB error. El dropdown usa clases del tema J2 (`um-*` / tailwind
según el estilo local de cada view, como el combobox actual).

## 8. Anexo — referencias de código

- Legacy (semántica portada): `tesoreria.vb6/clsREPPersona.cls` →
  `collectionSearch` (líneas 340-368: split por espacios, POST `persona/search`) y
  `formSearch` (405-419); `tesoreria.vb6/frmEstChequera.frm` → `txtPersona_KeyPress`
  (1037-1045) y `fillPersona` (521-536); `tesoreria.vb6/frmSearchNew.frm` →
  `txtCadena_Change` + `lstEncontrados`; `tesoreria.vb6/clsMODPersona.cls` →
  `textFound`/`keyFound`.
- Backend: `tesoreria-core/src/main/java/um/tesoreria/core/hexagonal/personas/persona/infrastructure/web/controller/PersonaController.java`
  (`POST /search` → `findByStrings`, y `GET /{uniqueId}` para rehidratar),
  `.../PersonaKeyRepositoryCustomImpl.java` (AND LIKE sobre `search`, máx 50),
  `.../domain/model/PersonaKey.java` (forma cruda de la respuesta; contiene campos
  sensibles).
- Frontend a reemplazar: `apps/externo-consulta/src/app/chequeras/chequeras.component.html`
  (bloque 91-155), `chequeras.component.ts` (teclado de sugerencias),
  `chequeras-busqueda.store.ts` (`sugerir`, `MINIMO_SUGERENCIA`),
  `chequeras.service.ts` (`sugerirPersonas`).
- Precedente de UI a imitar: `libs/ui-layout/src/lib/buscador-proveedor/` (combobox
  con POST `/search` de palabras) — mismo patrón, versión estricta/modernizada.
