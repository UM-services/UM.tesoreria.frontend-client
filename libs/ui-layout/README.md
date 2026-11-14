# ui-layout (tesorería)

Design system y shell compartido de las apps de tesorería. Los tokens y clases de
componente `um-*` viven en `src/styles/tokens.css` y los importa cada app desde su
`styles.css`.

## Directivas

### `[uiStickyFooter]` — barra de acciones fija al pie

Mantiene visible una barra de acciones (Guardar/Cancelar, paginación, totales) mientras
se recorre una pantalla larga, sin quedar fija por encima del contenido. Es la misma
característica que usa **Control del Período** en `haberes-frontend` (se extrajo como
directiva para reutilizarla).

- Selector: `uiStickyFooter` (`StickyFooterDirective`, standalone).
- Clase de tema: `.um-sticky-footer` en `tokens.css`.
- No requiere inputs.

```html
<div uiStickyFooter>
  <p class="text-xs text-um-muted">{{ filas().length }} registros</p>
  <div class="flex flex-wrap gap-2">
    <button type="button" class="um-btn-secondary">Cancelar</button>
    <button type="button" class="um-btn-primary">Guardar</button>
  </div>
</div>
```

Comportamiento y requisitos:

- Es `position: sticky` con `bottom: 0`, no `fixed`: participa del flujo. Con contenido
  corto aparece al final de la pantalla; con contenido largo acompaña el scroll y al
  llegar al final se apoya sobre su lugar, sin tapar la última fila.
- Debe ser el **último elemento** del contenido que scrollea (normalmente el final del
  componente de la pantalla).
- Entre la barra y el contenedor con scroll no puede haber un ancestro con
  `overflow: hidden`/`auto`: `sticky` se ancla a ese ancestro y dejaría de acompañar el
  scroll.
- La barra trae `justify-between`, `flex-wrap`, borde superior, fondo `bg-white/95` y
  `backdrop-blur`. Se puede ajustar por pantalla con utilidades (`justify-end`, `mt-2`,
  `bottom-14` si hay una barra inferior); las utilidades pisan la capa de componentes.

Uso previsto pendiente: **comprobantes del módulo de pagos**, donde hoy los botones
quedan al final de una lista larga. Para adoptarlo, mover el bloque de acciones al final
del template y agregarle el atributo:

```html
<div uiStickyFooter>
  <span>Todos los comprobantes del período</span>
  <div class="flex gap-2">
    <!-- botones existentes -->
  </div>
</div>
```

## Pruebas

```bash
npx nx test ui-layout
```
