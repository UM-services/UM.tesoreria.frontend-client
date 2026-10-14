import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';

/** Barra estilo procesador de textos por defecto. */
const MODULOS_POR_DEFECTO = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote', 'link'],
    ['clean'],
  ],
};

/**
 * Editor de texto enriquecido (WYSIWYG) basado en Quill 2 vía ngx-quill.
 *
 * Expone el **HTML** resultante con el two-way `[(html)]`. Requiere el CSS del tema
 * de Quill (p. ej. `quill/dist/quill.snow.css`) cargado globalmente por la app.
 *
 * `ngx-quill`/`quill` son pesados: este componente vive en su propia lib (`ui-rich-text`)
 * para que el bundler los cargue en el chunk lazy que lo consume y no en el bundle inicial.
 */
@Component({
  selector: 'ui-editor-enriquecido',
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './editor-enriquecido.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorEnriquecidoComponent {
  /** HTML del contenido (two-way). */
  readonly html = model<string>('');
  readonly placeholder = input<string>('');
  readonly readOnly = input<boolean>(false);
  /** Configuración de módulos de Quill (por defecto, barra tipo procesador de textos). */
  readonly modules = input<unknown>(MODULOS_POR_DEFECTO);
  /** Estilos del contenedor del editor. */
  readonly estilos = input<Record<string, string>>({ minHeight: '220px' });
}
