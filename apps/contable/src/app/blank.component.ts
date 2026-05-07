import { Component } from '@angular/core';

@Component({
  selector: 'app-blank',
  standalone: true,
  template: `
    <div class="h-full flex items-center justify-center text-gray-400">
      <div class="text-center space-y-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p class="text-sm font-medium">Seleccione una opción del menú lateral para comenzar.</p>
      </div>
    </div>
  `
})
export class BlankComponent {}
