import { CanDeactivateFn } from '@angular/router';

/**
 * Componente que puede impedir que se lo abandone cuando tiene cambios sin guardar.
 */
export interface SalidaConCambios {
  hayCambiosSinGuardar(): boolean;
}

/**
 * Pide confirmación antes de abandonar una pantalla con cambios sin guardar.
 *
 * Angular resuelve como navegación del Router tanto los enlaces como el botón atrás
 * del navegador, así que esta guard cubre los tres caminos. No bloquea el historial:
 * sólo evita perder trabajo sin avisar.
 *
 * ```ts
 * { path: 'formulario', component: FormularioComponent,
 *   canDeactivate: [confirmarSalida('Hay cambios sin guardar. ¿Salir igual?')] }
 * ```
 */
export const confirmarSalida = (
  pregunta = 'Hay cambios sin guardar. ¿Querés salir igual?',
): CanDeactivateFn<SalidaConCambios> => {
  return (component) => !component?.hayCambiosSinGuardar?.() || globalThis.confirm(pregunta);
};
