import { Component } from '@angular/core';

@Component({
  selector: 'app-nx-welcome',
  standalone: true,
  imports: [],
  template: `
    <div class="text-um-ink">
      <div class="um-page-header">
        <div>
          <p class="um-eyebrow">Chequeras / Dashboard</p>
          <h1 class="um-page-title">Dashboard de Chequeras</h1>
          <p class="um-page-desc">Gestión de emisiones y cobros.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 pt-7 md:grid-cols-3">
        <div
          class="flex flex-col items-center justify-center rounded border border-um-border bg-white p-6 text-center hover:bg-um-surface"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-um-selected">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-um-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold">Emisiones</h3>
          <p class="mt-1 text-sm text-um-muted">Control de chequeras emitidas.</p>
        </div>

        <div
          class="flex flex-col items-center justify-center rounded border border-um-border bg-white p-6 text-center hover:bg-um-surface"
        >
          <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-um-selected">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-um-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 class="text-lg font-semibold">Cobranzas</h3>
          <p class="mt-1 text-sm text-um-muted">Seguimiento de cuotas y series.</p>
        </div>

        <div
          class="flex flex-col justify-between rounded border border-um-sidebar bg-um-sidebar p-6 text-white"
        >
          <div>
            <h3 class="text-lg font-bold">Chequeras</h3>
            <p class="mt-1 text-sm text-um-sidebar-muted">
              Gestione el cobro de cuotas y series desde el menú.
            </p>
          </div>
          <div class="mt-6 flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-12 w-12 text-white opacity-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class NxWelcomeComponent {}
