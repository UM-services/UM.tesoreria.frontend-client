import { Directive } from '@angular/core';

/**
 * Convierte un contenedor en una **barra de acciones fija al pie del viewport**:
 * mientras la pantalla se desplaza, la barra queda visible y al llegar al final
 * ocupa su lugar en el flujo (no tapa contenido, a diferencia de `position: fixed`).
 *
 * El estilo vive en la clase de tema `um-sticky-footer`
 * (`libs/ui-layout/src/styles/tokens.css`): borde superior, fondo blanco
 * translúcido con desenfoque y layout flex que envuelve en pantallas angostas.
 *
 * ```html
 * <div uiStickyFooter>
 *   <p class="text-xs text-um-muted">12 registros</p>
 *   <div class="flex gap-2">
 *     <button type="button" class="um-btn-secondary">Cancelar</button>
 *     <button type="button" class="um-btn-primary">Guardar</button>
 *   </div>
 * </div>
 * ```
 *
 * Requisitos:
 * - Debe ser el último elemento del contenido de la pantalla (o de la sección que
 *   scrollea).
 * - Entre la barra y el contenedor con scroll no puede haber un ancestro con
 *   `overflow: hidden`/`auto`, porque `position: sticky` se ancla a ese ancestro.
 * - Si la pantalla tiene una barra inferior propia, ajustar el offset con una
 *   utilidad (`bottom-14`, etc.); las utilidades pisan la capa de componentes.
 */
@Directive({
  selector: '[uiStickyFooter]',
  standalone: true,
  host: { class: 'um-sticky-footer' },
})
export class StickyFooterDirective {}
