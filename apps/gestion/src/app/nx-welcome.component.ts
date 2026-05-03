import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@tesoreria/shared-api';

@Component({
  selector: 'app-nx-welcome',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Header Section -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard de Gestión</h1>
          <p class="mt-1 text-sm text-gray-500">Bienvenido al sistema integrado de tesorería.</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <svg class="mr-1.5 h-2 w-2 text-green-500" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
            Sistema Online
          </span>
        </div>
      </div>

      <!-- Main Dashboard Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Placeholder Card 1: Reports -->
        <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
            <div class="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900">Reportes Diarios</h3>
            <p class="mt-1 text-sm text-gray-500">Visualiza los resúmenes y movimientos del día.</p>
        </div>

        <!-- Placeholder Card 2: Notifications -->
        <div class="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 p-6 flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
            <div class="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900">Notificaciones</h3>
            <p class="mt-1 text-sm text-gray-500">Alertas de sistema y pendientes.</p>
        </div>

        <!-- Dashboard Action Card -->
        <div class="bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden shadow-md rounded-xl p-6 text-white flex flex-col justify-between">
          <div>
            <h3 class="text-lg font-medium">Panel de Acceso Rápido</h3>
            <p class="mt-1 text-sm text-blue-100 opacity-80">Selecciona una de las opciones del menú lateral para comenzar a trabajar.</p>
          </div>
          <div class="mt-6 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-white opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  `,
})
export class NxWelcomeComponent {}
