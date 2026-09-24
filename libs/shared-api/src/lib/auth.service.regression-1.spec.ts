import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { API_URL } from './tokens';

describe('AuthService without browser storage', () => {
  let originalStorage: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: API_URL, useValue: '' }],
    });
  });

  afterEach(() => {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('creates an anonymous session when storage is unavailable', () => {
    // Regression: ISSUE-001 — AppComponent tests crashed before rendering without browser storage.
    // Found by /qa on 2026-09-23.
    // Report: .gstack/qa-reports/qa-report-localhost-2026-09-23.md
    const service = TestBed.inject(AuthService);

    expect(service.currentUserValue).toBeNull();
  });
});
