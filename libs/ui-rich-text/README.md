# ui-rich-text

Editor de **texto enriquecido (WYSIWYG)** compartido del workspace. Envuelve
[Quill 2](https://quilljs.com/) vía [`ngx-quill@31`](https://github.com/KillerCodeMonkey/ngx-quill).

## Convención de uso

- **Convención:** cualquier vista que necesite **texto enriquecido / de formato largo**
  (especificaciones, descripciones, notas, observaciones) **debe** usar
  `<ui-editor-enriquecido>` en lugar de un `<textarea>` ad-hoc, un `contenteditable` o un editor
  Markdown propio. No se reimplementan barras de herramientas en las libs de feature.
- El **formato persistido es HTML** en la columna de texto existente, sanitizado con DOMPurify.
- Para mostrar el contenido en **solo lectura** se usa `<ui-texto-enriquecido>` de
  `@tesoreria/ui-layout` (renderiza HTML sanitizado y colapsa el texto largo); no se hace
  `[innerHTML]` directo.
- No se guarda HTML en campos cortos/estructurados o restringidos por el backend (p. ej. motivos de
  rechazo `varchar(500)`): esos quedan como texto plano.

## Uso

```html
<!-- app.config o providers de la vista (opcional): configuración global de Quill -->
<!-- componente -->
<ui-editor-enriquecido
  [(html)]="editorValor"
  [placeholder]="'Detallá las especificaciones…'"
  [readOnly]="false"
/>
```

- `html` (two-way, `model<string>`): HTML del contenido.
- `placeholder`, `readOnly`, `modules`, `estilos`: opcionales.

### CSS requerido

El tema de Quill debe cargarse **globalmente** por la app consumidora (no se puede encapsular por
componente por el límite de `anyComponentStyle`). Agregar a los `styles` del `project.json`:

```json
"styles": [
  "node_modules/quill/dist/quill.snow.css",
  "apps/<app>/src/styles.css"
]
```

### Bundle

`quill`/`ngx-quill` son pesados (~205 kB). Por eso el editor vive en su **propia lib**: debe
importarse **solo desde libs de feature lazy** (nunca desde el shell de una app, que se carga eager)
para que quede en un chunk lazy y no en el bundle inicial.

## Tests

La lib no tiene target de test (el editor renderiza un DOM real de Quill, difícil de cubrir en
jsdom). El render de solo lectura sí está cubierto en `ui-layout` (`texto-enriquecido.spec.ts`).
