const FOCUSABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function elementosEnfocables(contenedor: HTMLElement): HTMLElement[] {
  return Array.from(contenedor.querySelectorAll<HTMLElement>(FOCUSABLES));
}

/**
 * Mantiene el foco dentro del contenedor con Tab / Shift+Tab.
 * Devuelve true si movió el foco (y canceló el evento).
 */
export function atraparFoco(evento: KeyboardEvent, contenedor: HTMLElement): boolean {
  if (evento.key !== 'Tab') {
    return false;
  }
  const enfocables = elementosEnfocables(contenedor);
  if (enfocables.length === 0) {
    evento.preventDefault();
    return true;
  }
  const primero = enfocables[0];
  const ultimo = enfocables[enfocables.length - 1];
  const activo = document.activeElement;
  const fuera = !(activo instanceof Node) || !contenedor.contains(activo);

  if (evento.shiftKey && (activo === primero || fuera)) {
    evento.preventDefault();
    ultimo.focus();
    return true;
  }
  if (!evento.shiftKey && (activo === ultimo || fuera)) {
    evento.preventDefault();
    primero.focus();
    return true;
  }
  return false;
}
