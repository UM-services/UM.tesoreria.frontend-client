import { Component } from '@angular/core';

@Component({
  selector: 'app-nx-welcome',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard de Chequeras</h1>
          <p class="mt-1 text-sm text-gray-500">Gestión de emisiones y cobros.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow"
        >
          <div class="h-12 w-12 bg-purple-50 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-purple-600"
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
          <h3 class="text-lg font-medium text-gray-900">Emisiones</h3>
          <p class="mt-1 text-sm text-gray-500">Control de chequeras emitidas.</p>
        </div>

        <div
          class="bg-gradient-to-br from-purple-600 to-fuchsia-700 md:col-start-3 overflow-hidden shadow-md rounded-xl p-6 text-white flex flex-col justify-between"
        >
          <div>
            <h3 class="text-lg font-medium">Chequeras</h3>
            <p class="mt-1 text-sm text-purple-100 opacity-80">
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
