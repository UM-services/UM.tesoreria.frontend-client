import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { API_URL } from '@tesoreria/shared-api';
import { AppComponent } from './app';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), provideHttpClient(), { provide: API_URL, useValue: '' }],
    }).compileComponents();
  });

  it('should create', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
