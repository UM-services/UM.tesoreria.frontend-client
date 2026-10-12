import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Render de solo lectura de texto enriquecido (especificaciones de ítem, necesidad).
 *
 * El contenido se interpreta como **HTML** (el que produce el WYSIWYG) y se **sanitiza con
 * DOMPurify** antes de inyectarlo; el texto plano legacy (sin etiquetas) se respeta
 * convirtiendo sus saltos de línea a `<br>`. Colapsa el contenido extenso con
 * "Mostrar más/menos".
 *
 * DOMPurify se carga con `import()` diferido para no entrar al bundle inicial (el
 * componente se exporta desde el barrel de `ui-layout`, consumido de forma eager por los
 * shells).
 */
@Component({
  selector: 'ui-texto-enriquecido',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './texto-enriquecido.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextoEnriquecidoComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** HTML (o texto plano legacy) a mostrar. */
  readonly texto = input<string | null | undefined>(null);
  /** Cantidad de caracteres a partir de la cual se ofrece "Mostrar más". */
  readonly umbralColapso = input<number>(240);
  /** Si es `false`, nunca se ofrece el colapso (útil para vistas previas). */
  readonly permitirColapso = input<boolean>(true);
  /** Estado de expansión del contenido. */
  readonly expandido = signal(false);
  /** HTML sanitizado resultante. */
  readonly html = signal<SafeHtml>('');

  private tokenRender = 0;

  readonly contenido = computed(() => (this.texto() ?? '').trim());
  readonly vacio = computed(() => this.contenido().length === 0);
  readonly colapsable = computed(
    () => this.permitirColapso() && this.contenido().length > this.umbralColapso(),
  );
  readonly mostrarTodo = computed(() => this.expandido() || !this.colapsable());

  constructor() {
    effect(() => {
      void this.renderizar(this.contenido());
    });
  }

  alternar(): void {
    this.expandido.update((valor) => !valor);
  }

  private async renderizar(texto: string): Promise<void> {
    const token = ++this.tokenRender;
    if (!texto) {
      this.html.set('');
      return;
    }
    const dompurify = (await import('dompurify')).default;
    if (token !== this.tokenRender) {
      return;
    }
    const limpio = dompurify.sanitize(this.aHtml(texto), { USE_PROFILES: { html: true } });
    this.html.set(this.sanitizer.bypassSecurityTrustHtml(limpio));
  }

  private aHtml(texto: string): string {
    // El WYSIWYG guarda HTML; el texto plano legacy se respeta con saltos de línea.
    if (/<\/?[a-z][\s\S]*>/i.test(texto)) {
      return texto;
    }
    return this.escapar(texto).replace(/\n/g, '<br>');
  }

  private escapar(texto: string): string {
    return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
